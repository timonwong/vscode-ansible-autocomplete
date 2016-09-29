#!/usr/bin/env python
# -*- coding: utf-8 -*-
import codecs
import json
import os
from collections import defaultdict

from ansible.cli.doc import DocCLI
from ansible.playbook import  Play
from ansible.playbook.block import  Block
from ansible.playbook.role import  Role
from ansible.playbook.task import  Task
from ansible.plugins import lookup_loader, module_loader
from ansible.utils import module_docs


__path__ = os.path.dirname(__file__)


def main():
    doc_cli = DocCLI([])
    module_paths = module_loader._get_paths()

    module_keys = ('module', 'short_description', 'options', 'deprecated')

    for path in module_paths:
        doc_cli.find_modules(path)

    result = {
        'modules': [],
        'directives': defaultdict(list),
        'lookup_plugins': [],
    }

    for module in sorted(set(doc_cli.module_list)):
        if module in module_docs.BLACKLIST_MODULES:
            continue
        filename = module_loader.find_plugin(module, mod_type='.py')
        if not filename:
            continue
        if filename.endswith('.ps1'):
            continue
        if os.path.isdir(filename):
            continue
        try:
            doc, plain_examples, return_docs = module_docs.get_docstring(filename)
            filtered_doc = {key: doc.get(key) for key in module_keys}
            result['modules'].append(filtered_doc)
        except Exception:
            pass

    for aclass in (Play, Role, Block, Task):
        aobj = aclass()
        name = aclass.__name__

        for attr in aobj.__dict__['_attributes']:
            if 'private' in attr and attr.private:
                continue
            direct_target = result['directives'][attr]
            direct_target.append(name)
            if attr == 'action':
                local_action = result['directives']['local_action']
                local_action.append(name)
    result['directives']['with_'] = ['Task']

    for lookup in lookup_loader.all():
        name = os.path.splitext(os.path.basename(lookup._original_path))[0]
        result['lookup_plugins'].append(name)

    fn = os.path.join(__path__, '../data/ansible-data.json')
    with codecs.open(fn, 'wb', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()

import * as fs from 'fs';
import * as path from 'path';

import { CompletionItem, CompletionItemKind } from 'vscode';

export interface AnsibleDataDirective {
    module: string;
    deprecated?: string;
    short_description: string;
    options: AnsibleDataDirectiveOptions;
}

export interface AnsibleDataDirectiveOption {
    default: string;
    required: boolean;
    description: string[];
    choices?: string[];
}

export type AnsibleDataDirectiveOptions = { [key: string]: AnsibleDataDirectiveOption };

export type AnsibleJSONDataDirectives = { [key: string]: string[] };
export type AnsibleJSONDataModules = AnsibleDataDirective[];
export type AnsibleJSONDataLookupPlugins = string[];

export interface AnsibleJSONData {
    modules: AnsibleJSONDataModules;
    directives: AnsibleJSONDataDirectives;
    lookup_plugins: AnsibleJSONDataLookupPlugins;
}

export class AnsibleCompletionItem extends CompletionItem {
    extraOptions: AnsibleDataDirectiveOptions;
}
export type AnsibleCompletionItemList = AnsibleCompletionItem[];

export class AnsibleCompletionData {
    public modules: AnsibleCompletionItemList;
    public directives: AnsibleCompletionItemList;
    public loopDirectives: AnsibleCompletionItemList;

    constructor(modules: AnsibleCompletionItemList, directives: AnsibleCompletionItemList, loopDirectives: AnsibleCompletionItemList) {
        this.modules = modules;
        this.directives = directives;
        this.loopDirectives = loopDirectives;
    }
}

export function parseAnsibleCompletionData(data: string): AnsibleCompletionData {
    let ansibleData = <AnsibleJSONData>JSON.parse(data);

    let modules = ansibleData.modules.map((elm) => {
        let item = new AnsibleCompletionItem(elm.module, CompletionItemKind.Function);
        item.detail = 'module';
        item.documentation = `${elm.short_description || ''}\nhttp://docs.ansible.com/ansible/${elm.module}_module.html`;
        if (elm.deprecated) {
            item.detail = `(Deprecated) ${item.detail}`;
        }
        item.extraOptions = elm.options;
        return item;
    });

    let directives: AnsibleCompletionItemList = [];
    Object.keys(ansibleData.directives).forEach((key) => {
        let item = new AnsibleCompletionItem(key, CompletionItemKind.Keyword);
        item.detail = 'directive';
        item.documentation = `directive for ${ansibleData.directives[key].join(', ')}.`;
        directives.push(item);
    });

    let loopDirectives = ansibleData.lookup_plugins.map((elm) => {
        let item = new AnsibleCompletionItem(`with_${elm}`, CompletionItemKind.Keyword);
        item.detail = 'loop directive';
        item.documentation = 'directive for loop';
        return item;
    });

    return new AnsibleCompletionData(modules, directives, loopDirectives);
}


export function parseAnsibleCompletionFile(filename?: string): Promise<AnsibleCompletionData> {
    if (!filename) {
        filename = path.join(__dirname, '../../data/ansible-data.json');
    }

    return new Promise<AnsibleCompletionData>((resolve, reject) => {
            fs.readFile(filename, 'utf-8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(parseAnsibleCompletionData(data));
            }
        });
    });
}

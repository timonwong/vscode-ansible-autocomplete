import * as vscode from 'vscode';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { filter } from 'fuzzaldrin-plus';
import { parseAnsibleJSONFile, AnsibleCompletionData, AnsibleCompletionItemList } from './data';


const SNIPPET_REGEXP = /^\s*(-?)[^:]*(:?)\s+(([0-9a-zA-Z_]+)([ar]))$/;

export class CompletionEngine {
    private data: AnsibleCompletionData;

    constructor() {
        parseAnsibleJSONFile()
            .then((completionData) => {
                this.data = completionData;
            })
            .catch((err) => {
                console.log(err);
                vscode.window.showErrorMessage(err);
            });
    }

    ready(): boolean {
        return !!this.data;
    }

    getCompletions(prefix: string, line: string): CompletionItem[] {
        let moduleRegexp = new RegExp(`^\\s*-?\\s+(action\\s*:\\s+|local_action\\s*:\\s+|)${prefix}$`);
        let result = this.getSnippets(line.match(SNIPPET_REGEXP));
        let moduleMatch = line.match(moduleRegexp);
        if (moduleMatch) {
            if (!moduleMatch[1]) {
                if (/^with_/.test(prefix)) {
                    Array.prototype.push.apply(result, getFuzzySuggestions(this.data.loopDirectives, prefix));
                }
                Array.prototype.push.apply(result, getFuzzySuggestions(this.data.directives, prefix));
            }
            Array.prototype.push.apply(result, getFuzzySuggestions(this.data.modules, prefix));
        }

        return result;
    }

    private getSnippets(match: RegExpMatchArray): CompletionItem[] {
        if (!match) {
            return [];
        }

        const completionData = this.data;
        let indent = match[1] ? '\t' : '';
        let hasColon = match[2];
        let replacementPrefix = match[3];
        let moduleName = match[4];
        let addOptions = match[5] === 'a';
        let moduleIndex = completionData.modules.map((elm) => elm.label).indexOf(moduleName);
        let lines = [`${moduleName}${hasColon ? '' : ':'}`];

        if (moduleIndex === -1) {
            return [];
        }

        let moduleObj = completionData.modules[moduleIndex];

        if (hasColon) {
            lines.push('args:');
        }

        let args = Object.keys(moduleObj.extraOptions).sort((a, b) => {
            let aObj = moduleObj.extraOptions[a];
            let bObj = moduleObj.extraOptions[b];
            if (aObj.required && !bObj.required) return -1;
            if (!aObj.required && bObj.required) return 1;
            return 0;
        });

        for (let i = 0; i < args.length; i++) {
            let argName = args[i];
            let option = moduleObj.extraOptions[argName];
            if (!addOptions && !option.required) {
                continue;
            }

            let snip = `{{${i}:${option.default}  # ${option.description}}}`;
            if (['free_form', 'free-form'].indexOf(argName) >= 0) {
                if (hasColon) {
                    lines.push(`\t_raw_params: ${snip}`);
                } else {
                    lines[0] += ` ${snip}`;
                    lines.splice(1, 0, 'args:');
                }
            } else {
                lines.push(`\t${argName}: ${snip}`);
            }
        }

        if (lines.length === 2 && lines[1] === 'args:') {
            lines.pop();
        }

        let item = new CompletionItem(`${moduleName}${match[5]}`, CompletionItemKind.Snippet);
        item.insertText = lines.join('\n' + indent);
        item.detail = `${moduleObj.detail} snippet`;
        item.documentation = moduleObj.documentation;
        return [item];
    }
}


function getFuzzySuggestions(data: AnsibleCompletionItemList, prefix: string): CompletionItem[] {
    return filter(data, prefix, { key: 'label' });
}

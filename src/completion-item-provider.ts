import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem } from 'vscode';
import { CompletionEngine } from './completion-engine';


export class AnsibleCompletionItemProvider implements CompletionItemProvider {
    private completionEngine: CompletionEngine;

    constructor() {
        this.completionEngine = new CompletionEngine();
    }

    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): CompletionItem[] {
        if (!this.completionEngine.ready()) {
            return [];
        }

        let range = document.getWordRangeAtPosition(position);
        let prefix = range ? document.getText(range) : '';
        let line = document.lineAt(position.line).text;

        return this.completionEngine.getCompletions(prefix, line);
    }
}

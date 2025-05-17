Page({
    onReady() {
        this.customEditor = this.selectComponent('.custom-editor');
    },
    getContents() {
        const contents = this.customEditor.getContents('html');
        console.log('Received contents:', contents);
    },
    setContents() {
        this.customEditor.setContents('<p>New Content</p>');
    },
    insertText() {
        this.customEditor.insertText('Sample Text');
    },
    insertImage() {
        this.customEditor.insertImage('https://example.com/image.jpg');
    },
    clear() {
        this.customEditor.clear();
    },
    undo() {
        this.customEditor.undo();
    },
    redo() {
        this.customEditor.redo();
    }
});
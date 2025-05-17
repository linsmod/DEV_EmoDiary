Component({
    properties: {
        initialContent: {
            type: String,
            value: '',
            observer(newVal) {
                this.setData({ content: newVal });
                this.saveState();
            }
        }
    },
    data: {
        content: '',
        history: [],
        future: []
    },
    methods: {
        handleInput(e) {
            const newContent = e.detail.html;
            this.setData({ content: newContent });
            this.saveState();
        },
        handlePaste(e) {
            e.preventDefault();
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = reader.result.split(',')[1];
                        this.insertImage(base64String);
                    };
                    reader.readAsDataURL(blob);
                } else if (items[i].type === 'text/plain' || items[i].type === '') {
                    items[i].getAsString((text) => {
                        this.insertText(text);
                    });
                }
            }
        },
        saveState() {
            if (this.data.history.length > 100) {
                this.data.history.shift();
            }
            this.data.history.push(this.data.content);
            this.data.future = [];
        },
        getContents(format = 'html') {
            const content = this.data.content;
            return format === 'delta' ? this.convertHtmlToDelta(content) : content;
        },
        setContents(htmlContent) {
            this.setData({ content: htmlContent || '' });
            this.saveState();
        },
        insertText(text) {
            const selection = wx.createSelectorQuery().select('#editor').context(function(res) {
                res.node.focus();
                const range = document.getSelection().getRangeAt(0);
                const node = document.createTextNode(text);
                range.insertNode(node);
                range.setStartAfter(node);
                range.collapse(true);

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }).exec();

            this.saveState();
        },
        insertImage(url) {
            const img = `<img src="${url}" style="max-width: 100%;">`;
            const selection = wx.createSelectorQuery().select('#editor').context(function(res) {
                res.node.focus();
                const range = document.getSelection().getRangeAt(0);
                range.deleteContents();
                const div = document.createElement('div');
                div.innerHTML = img;
                range.insertNode(div.firstChild);
                range.setStartAfter(div.firstChild);
                range.collapse(true);

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }).exec();

            this.saveState();
        },
        clear() {
            this.setContents('');
        },
        undo() {
            if (this.data.history.length <= 1) return;
            this.data.future.push(this.data.history.pop());
            this.setContents(this.data.history[this.data.history.length - 1]);
        },
        redo() {
            if (!this.data.future.length) return;
            this.setContents(this.data.future.pop());
        },
        convertHtmlToDelta(html) {
            // 简单转换逻辑，实际项目中可能需要更复杂的转换
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const body = doc.body;
            const delta = { ops: [] };

            function traverse(node) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    delta.ops.push({ insert: node.textContent });
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    switch (node.tagName.toLowerCase()) {
                        case 'p':
                            traverseChildren(node);
                            delta.ops.push({ insert: '\n' });
                            break;
                        case 'br':
                            delta.ops.push({ insert: '\n' });
                            break;
                        case 'strong':
                        case 'b':
                            delta.ops.push({ insert: node.textContent, attributes: { bold: true } });
                            break;
                        case 'em':
                        case 'i':
                            delta.ops.push({ insert: node.textContent, attributes: { italic: true } });
                            break;
                        case 'u':
                            delta.ops.push({ insert: node.textContent, attributes: { underline: true } });
                            break;
                        case 'a':
                            delta.ops.push({
                                insert: node.textContent,
                                attributes: { link: node.getAttribute('href') }
                            });
                            break;
                        case 'img':
                            delta.ops.push({
                                insert: { image: node.getAttribute('src') }
                            });
                            break;
                        default:
                            traverseChildren(node);
                    }
                }
            }

            function traverseChildren(parent) {
                parent.childNodes.forEach(traverse);
            }

            traverse(body);
            return delta;
        }
    }
});
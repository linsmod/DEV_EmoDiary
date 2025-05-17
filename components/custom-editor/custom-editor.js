Component({
    properties: {
        initialContent: {
            type: String,
            value: '',
            observer(newVal) {
                this.setData({ content: newVal });
                this.saveState();
                // 更新编辑器内容
                setTimeout(() => {
                    this.updateEditorContent();
                }, 50);
            }
        }
    },
    data: {
        content: '',
        history: [],
        future: [],
        currentFormats: {}
    },
    lifetimes: {
        attached() {
            // 初始化编辑器
            if (this.properties.initialContent) {
                this.setData({ content: this.properties.initialContent });
                this.saveState();
                // 在编辑器准备好后设置内容
                setTimeout(() => {
                    this.updateEditorContent();
                }, 100);
            }
        }
    },
    methods: {
        // 更新编辑器内容
        updateEditorContent() {
            const that = this;
            wx.createSelectorQuery().in(this).select('#editor').context(function(res) {
                if (res && res.context) {
                    // 使用execCommand来设置内容，这在小程序环境中更可靠
                    res.context.execCommand('selectAll', false);
                    res.context.execCommand('delete', false);
                    res.context.execCommand('insertHTML', false, that.data.content);
                }
            }).exec();
        },
        
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
            // 更新编辑器内容
            setTimeout(() => {
                this.updateEditorContent();
            }, 50);
        },
        insertText(text) {
            const that = this;
            wx.createSelectorQuery().in(this).select('#editor').context(function(res) {
                if (res && res.context) {
                    res.context.execCommand('insertText', false, text);
                    that.saveState();
                }
            }).exec();
        },
        insertImage(url) {
            const that = this;
            const img = `<img src="${url}" style="max-width: 100%;">`;
            wx.createSelectorQuery().in(this).select('#editor').context(function(res) {
                if (res && res.context) {
                    res.context.execCommand('insertHTML', false, img);
                    that.saveState();
                }
            }).exec();
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
        // 格式化方法
        format(name, value = null) {
            const that = this;
            wx.createSelectorQuery().in(this).select('#editor').context(function(res) {
                if (res && res.context) {
                    // 根据格式类型执行不同的命令
                    switch (name) {
                        case 'bold':
                            res.context.execCommand('bold', false);
                            break;
                        case 'italic':
                            res.context.execCommand('italic', false);
                            break;
                        case 'underline':
                            res.context.execCommand('underline', false);
                            break;
                        case 'strike':
                            res.context.execCommand('strikeThrough', false);
                            break;
                        case 'align':
                            res.context.execCommand('justify' + value.charAt(0).toUpperCase() + value.slice(1), false);
                            break;
                        case 'list':
                            if (value === 'ordered') {
                                res.context.execCommand('insertOrderedList', false);
                            } else if (value === 'bullet') {
                                res.context.execCommand('insertUnorderedList', false);
                            }
                            break;
                        case 'color':
                            res.context.execCommand('foreColor', false, value);
                            break;
                        case 'background':
                            res.context.execCommand('hiliteColor', false, value);
                            break;
                    }
                    that.saveState();
                    that.updateFormats();
                }
            }).exec();
        },
        // 获取当前选中文本的格式
        getFormats() {
            const formats = {};
            const that = this;
            
            wx.createSelectorQuery().in(this).select('#editor').context(function(res) {
                if (res && res.context) {
                    // 检查基本格式
                    formats.bold = document.queryCommandState('bold');
                    formats.italic = document.queryCommandState('italic');
                    formats.underline = document.queryCommandState('underline');
                    formats.strike = document.queryCommandState('strikeThrough');
                    
                    // 检查对齐方式
                    formats.alignLeft = document.queryCommandState('justifyLeft');
                    formats.alignCenter = document.queryCommandState('justifyCenter');
                    formats.alignRight = document.queryCommandState('justifyRight');
                    
                    // 检查列表
                    formats.orderedList = document.queryCommandState('insertOrderedList');
                    formats.bulletList = document.queryCommandState('insertUnorderedList');
                    
                    // 获取颜色
                    formats.color = document.queryCommandValue('foreColor');
                    formats.background = document.queryCommandValue('hiliteColor');
                    
                    that.setData({ currentFormats: formats });
                }
            }).exec();
            
            return this.data.currentFormats;
        },
        // 更新格式状态
        updateFormats() {
            this.getFormats();
        },
        convertHtmlToDelta(html) {
            // 简单转换逻辑，实际项目中可能需要更复杂的转换
            const delta = { ops: [] };
            
            if (!html) return delta;
            
            try {
                // 创建临时div解析HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                function traverse(node) {
                    if (node.nodeType === 3 && node.textContent.trim()) { // 文本节点
                        delta.ops.push({ insert: node.textContent });
                    } else if (node.nodeType === 1) { // 元素节点
                        const attributes = {};
                        
                        // 检查样式和标签
                        switch (node.tagName.toLowerCase()) {
                            case 'b':
                            case 'strong':
                                attributes.bold = true;
                                break;
                            case 'i':
                            case 'em':
                                attributes.italic = true;
                                break;
                            case 'u':
                                attributes.underline = true;
                                break;
                            case 's':
                            case 'strike':
                            case 'del':
                                attributes.strike = true;
                                break;
                            case 'p':
                                if (node.style.textAlign) {
                                    attributes.align = node.style.textAlign;
                                }
                                break;
                            case 'ol':
                                attributes.list = 'ordered';
                                break;
                            case 'ul':
                                attributes.list = 'bullet';
                                break;
                            case 'img':
                                delta.ops.push({
                                    insert: { image: node.src }
                                });
                                return;
                        }
                        
                        // 处理内联样式
                        if (node.style) {
                            if (node.style.color) attributes.color = node.style.color;
                            if (node.style.backgroundColor) attributes.background = node.style.backgroundColor;
                        }
                        
                        // 处理子节点
                        if (node.childNodes.length > 0) {
                            for (let i = 0; i < node.childNodes.length; i++) {
                                traverse(node.childNodes[i]);
                            }
                        }
                        
                        // 添加换行和属性
                        if (node.tagName.toLowerCase() === 'p' || node.tagName.toLowerCase() === 'div') {
                            delta.ops.push({ insert: '\n', attributes });
                        }
                    }
                }
                
                // 遍历所有子节点
                for (let i = 0; i < tempDiv.childNodes.length; i++) {
                    traverse(tempDiv.childNodes[i]);
                }
                
                return delta;
            } catch (error) {
                console.error('Error converting HTML to Delta:', error);
                return { ops: [{ insert: html }] };
            }
        }
    }
});
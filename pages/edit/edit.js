// pages/edit/edit.js
const TARGET_EDITOR = 'editor';
const TARGET_TITLE = 'title';
const TARGET_EDITOR_LF = 'editor:lost_focus';
const TARGET_TITLE_LF = 'title:lost_focus';
Page({
  data: {
    id: '',
    title: '',
    content: '',
    isEdit: false,
    autoSaveTimer: null,
    editorCtx: null,
    formats: {},
    fontSize: 'normal',
    showColorPicker: false,
    colors: ['#ffffff', '#f8bbd0', '#e1f5fe', '#f1f8e9', '#fff8e1', '#efebe9'],
    wordCount: 0, // 内容字数统计
    canUndo: false, // 是否可以撤销
    canRedo: false, // 是否可以重做
    activeAlign: 'left', // 当前激活的对齐方式
    activeList: '', // 当前激活的列表类型
    activeFontSize: 'normal', // 当前激活的字体大小
    formatsJSON: '',
    // 浮动按钮相关
    buttonRight: 30, // 按钮初始位置
    buttonBottom: 200,
    startX: 0, // 触摸起始位置
    startY: 0,
    buttonMoving: false, // 是否正在拖动
    debounceTimer: null,
    history: [], // for title only
    further: [], // for title only
    readonly: false,
    focusedTarget: 'title',
    changes: 0,
    scrollTop: 0, // 页面滚动位置
    keyboardHeight: 0, // 键盘高度
    editorMarginTop: 0 // 编辑器底部padding
  },
  onEditorBlur: function () {
    this.setData({
      focusedTarget: TARGET_EDITOR_LF
    });
  },
  // 数据迁移：确保所有笔记都有有效ID
  migrateNotes: function () {
    let notes = wx.getStorageSync('notes') || [];
    let needsUpdate = false;

    notes = notes.map(note => {
      if (!note.id || typeof note.id !== 'string') {
        needsUpdate = true;
        return {
          ...note,
          id: Date.now().toString(),
          // 为旧数据添加缺失的字段
          createTime: note.createTime || Date.now(),
          updateTime: note.updateTime || Date.now(),
          updateTimeStr: note.updateTimeStr || new Date().toLocaleString()
        };
      }
      return note;
    });

    if (needsUpdate) {
      wx.setStorageSync('notes', notes);
    }
    return notes;
  },

  onLoad: function (options) {
    // 监听键盘高度变化
    wx.onKeyboardHeightChange(res => {
      if (this.data.focusedTarget.startsWith(TARGET_TITLE)) {
        this.setData({
          editorMarginTop: 0
        });
        return;
      }
      const keyboardHeight = res.height;
      const toolbarHeight = 80;
      setTimeout(() => {
        this.setData({
          editorMarginTop: keyboardHeight > 0 ? toolbarHeight : 0
        });
      }, 150); // ensure margin adjusing is after layout completed.
    });

    // 先执行数据迁移
    const notes = this.migrateNotes();

    // 如果传入了id，说明是编辑现有笔记
    if (options.id) {
      const note = notes.find(n => n.id === options.id);

      if (note) {
        this.setData({
          id: note.id,
          title: note.title,
          content: note.content,
          initialContent: note.content,
          updateTime: note.updateTime,
          updateTimeStr: note.updateTimeStr,
          isEdit: true
        });

        wx.setNavigationBarTitle({
          title: '编辑笔记'
        });
      }
    } else {
      wx.setNavigationBarTitle({
        title: '新建笔记'
      });
    }

    // 设置自动保存定时器
    this.setData({
      autoSaveTimer: setInterval(() => {
        this.autoSave();
      }, 10000) // 每10秒自动保存一次
    });
  },

  // 处理编辑器状态变化
  onStatusChange: function (e) {
    console.log(e)
    const formats = e.detail;
    this.setData({
      formats,
      formatsJSON: JSON.stringify(formats),
      activeAlign: formats.align || 'left',
      activeList: formats.list || '',
      activeFontSize: formats.size === '14px' ? 'small' : formats.size === '18px' ? 'large' : 'normal',
      activeBold: formats.bold || '',
      activeItalic: formats.italic || '',
      activeUnderline: formats.underline || '',
    });
    this.data.changes++;
  },

  // 编辑器初始化完成时触发
  onEditorReady: function () {
    const that = this;
    wx.createSelectorQuery().select('#editor').context(function (res) {
      that.setData({
        editorCtx: res.context
      });

      // 如果是编辑模式，设置编辑器内容
      if (that.data.isEdit) {
        // 判断内容是否为HTML格式
        if (that.data.content.indexOf('<') !== -1 && that.data.content.indexOf('>') !== -1) {
          that.data.editorCtx.setContents({
            html: that.data.content
          });
        } else {
          // 如果是纯文本，转换为HTML
          that.data.editorCtx.setContents({
            html: that.data.content.split('\n').map(x => `<p>${x}</p>`).join(''),
          });
        }
        // 初始化字数统计
        that.setData({
          wordCount: that.getTextLength(that.data.content)
        });
      }
      that.setData({
        history: [],
        historyIndex: -1
      })
    }).exec();
  },

  // 标题输入事件
  onTitleInput: function (e) {
    const now = new Date();
    const oldTitle = this.data.title;
    this.setData({
      title: e.detail.value,
      wordCount: 0,
      updateTime: now.getTime(),
      updateTimeStr: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    });

    // 将旧标题保存到history，新标题保存到data.title
    // 清空future数组
    this.data.further = [];
    // 添加到history
    this.data.history.push({
      type: 'title',
      oldValue: oldTitle,
      newValue: e.detail.value,
      time: Date.now()
    });
    this.data.changes++;
  },

  // 标题获得焦点
  onTitleFocus: function (e) {
    this.setData({
      focusedTarget: TARGET_TITLE,
      // readonly: true
    });
  },

  // 标题失去焦点
  onTitleBlur: function (e) {
    this.setData({
      focusedTarget: TARGET_TITLE_LF,
    });
  },

  onEditorFocus: function (e) {
    this.setData({
      focusedTarget: TARGET_EDITOR,
      readonly: false
    });
  },
  // 内容输入事件
  onContentInput: function (e) {
    // 编辑器的输入事件会返回HTML内容
    this.setData({
      content: e.detail.html || '',
      wordCount: this.getTextLength(e.detail.html || '')
    });
    // No need record the content because we use editorContext to perform redo/undo

    this.data.changes++;
  },

  // 切换字体大小
  toggleFontSize: function () {
    const sizes = ['small', 'normal', 'large', 'xlarge', 'xxlarge', 'xxxlarge'];
    const currentIndex = sizes.indexOf(this.data.activeFontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const nextSize = sizes[nextIndex];

    this.setData({
      activeFontSize: nextSize,
      fontSize: nextSize
    });

    let fontSize;
    switch (nextSize) {
      case 'small':
        fontSize = '14px';
        break;
      case 'large':
        fontSize = '18px';
        break;
      case 'xlarge':
        fontSize = '20px';
        break;
      case 'xxlarge':
        fontSize = '22px';
        break;
      case 'xxxlarge':
        fontSize = '24px';
        break;
      case 'normal':
      default:
        fontSize = '16px';
    }

    this.runAction(() => {
      this.data.editorCtx.format('fontSize', fontSize);
    })

  },

  // 显示颜色选择器
  showColorPicker: function () {
    this.setData({
      showColorPicker: !this.data.showColorPicker
    });
  },

  // 设置背景色
  setBackgroundColor: function (e) {
    const color = e.currentTarget.dataset.color;

    this.setData({
      showColorPicker: false
    });
    this.runAction(() => {
      this.data.editorCtx.format('backgroundColor', color);
    })

  },

  // 切换对齐方式
  toggleAlign: function () {
    const alignTypes = ['left', 'center', 'right', 'justify'];
    const currentIndex = alignTypes.indexOf(this.data.activeAlign);
    const nextIndex = (currentIndex + 1) % alignTypes.length;
    const nextAlign = alignTypes[nextIndex];

    this.setData({
      activeAlign: nextAlign
    });
    this.runAction(() => {
      this.data.editorCtx.format('align', nextAlign);
    })

  },

  // 切换列表类型
  toggleList: function () {

    const listTypes = ['', 'ordered', 'bullet', 'check'];
    const currentIndex = listTypes.indexOf(this.data.activeList);
    const nextIndex = (currentIndex + 1) % listTypes.length;
    const nextList = listTypes[nextIndex];

    this.setData({
      activeList: nextList
    });
    this.runAction(() => {
      this.data.editorCtx.format('list', nextList);
    })
  },

  runAction: function (func) {
    const rd = this.data.readonly;
    this.setData({
      readonly: false
    })
    func();
    this.data.editorCtx.focus()
    this.setData({
      readonly: rd
    });
  },
  // 格式化功能
  toggleBold: function (e) {
    this.runAction(() => {
      this.data.editorCtx.format('bold', this.data.activeBold == 'strong' ? '' : 'strong');
    })
  },
  toggleItalic: function (e) {
    this.runAction(() => {
      this.data.editorCtx.format('italic', this.data.activeItalic == 'em' ? '' : 'em');
    })
  },

  // 自动保存
  autoSave: function () {
    if (this.data.changes > 0) {
      this.saveNote(true);
      this.data.changes = 0;
    }
  },

  // 保存笔记
  saveNote: function (isAutoSave = false) {
    const title = this.data.title;
    const content = this.data.content;

    // 如果标题和内容都为空，不保存
    if (!title && !content) {
      // if (!isAutoSave) {
      //   wx.showToast({
      //     title: '笔记内容不能为空',
      //     icon: 'none'
      //   });
      // }
      return;
    }

    const now = new Date();
    const notes = wx.getStorageSync('notes') || [];

    // 格式化时间
    const updateTimeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (this.data.isEdit) {
      // 编辑现有笔记
      const index = notes.findIndex(n => n.id === this.data.id);
      if (index !== -1) {
        notes[index] = {
          ...notes[index],
          title,
          content,
          updateTime: now.getTime(),
          updateTimeStr
        };
      }
    } else {
      // 创建新笔记
      const newNote = {
        id: Date.now().toString(),
        title,
        content,
        createTime: now.getTime(),
        updateTime: now.getTime(),
        updateTimeStr
      };
      notes.unshift(newNote);

      // 更新页面数据，使其变为编辑模式
      this.setData({
        id: newNote.id,
        isEdit: true
      });
    }

    wx.setStorageSync('notes', notes);

    if (!isAutoSave) {
      // wx.showToast({
      //   title: '保存成功',
      //   icon: 'success'
      // });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 0);
    } else {
      console.log('自动保存成功');
    }
  },

  // 保存按钮点击事件
  onSave: function () {
    this.saveNote();
  },
  undo: function () {
    if (this.data.focusedTarget.startsWith(TARGET_TITLE)) {
      // 标题的撤销操作
      if (this.data.history.length > 0) {
        const lastChange = this.data.history.pop();
        if (lastChange.type === 'title') {
          // 保存当前状态到future数组
          this.data.further.push({
            type: 'title',
            oldValue: this.data.title,
            newValue: lastChange.newValue,
            time: Date.now()
          });

          // 恢复到上一个状态
          this.setData({
            title: lastChange.oldValue
          });
          this.data.changes++;
        }
      }
    } else {
      // 编辑器的撤销操作
      if (!this.data.editorCtx) return;

      // 防止清空初始内容
      if (this.data.isEdit && this.data.initialContent === this.data.content) {
        return;
      }

      this.data.editorCtx.undo();
      // Assumming have a change forcely
      this.data.changes++;
    }
  },

  redo: function () {
    if (this.data.focusedTarget.startsWith(TARGET_TITLE)) {
      // 标题的重做操作
      if (this.data.further.length > 0) {
        const nextChange = this.data.further.pop();
        if (nextChange.type === 'title') {
          // 保存当前状态到history数组
          this.data.history.push({
            type: 'title',
            oldValue: this.data.title,
            newValue: nextChange.newValue,
            time: Date.now()
          });

          // 恢复到下一个状态
          this.setData({
            title: nextChange.newValue
          });
          this.data.changes++;
        }
      }
    } else {
      // 编辑器的重做操作
      if (!this.data.editorCtx) return;
      this.data.editorCtx.redo();
      //Assuming a changes
      this.data.changes++;
    }
  },

  // 引入公共字数统计函数
  getTextLength: require('../../utils/textUtils').getTextLength,

  // 浮动按钮触摸开始
  onButtonTouchStart: function (e) {
    if (this.data.debounceTimer) {
      clearTimeout(this.data.debounceTimer);
    }
    this.setData({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      buttonMoving: true,
      debounceTimer: null
    });
  },

  onButtonTouchMove: function (e) {
    if (!this.data.buttonMoving) return;

    const systemInfo = wx.getSystemInfoSync();
    const windowWidth = systemInfo.windowWidth; // 屏幕可用宽度（px）
    const windowHeight = systemInfo.windowHeight; // 屏幕可用高度（px）

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    // ===== 边界检测：如果触点接近屏幕边缘，停止拖动 =====
    let adjustedX = currentX;
    let adjustedY = currentY;

    if (adjustedX < 25) {
      adjustedX = 25;
    }
    if (adjustedX > windowWidth - 25) {
      adjustedX = windowWidth - 25;
    }
    if (adjustedY < 25) {
      adjustedY = 25;
    }
    if (adjustedY > windowHeight - 25) {
      adjustedY = windowHeight - 25;
    }

    // ===== 计算偏移量 =====
    const deltaX = adjustedX - this.data.startX;
    const deltaY = adjustedY - this.data.startY;

    // 清除之前的定时器
    if (this.data.debounceTimer) {
      clearTimeout(this.data.debounceTimer);
    }

    // 设置新的定时器，延迟更新位置（例如：50ms）
    const timer = setTimeout(() => {
      this.setData({
        buttonRight: this.data.buttonRight - deltaX,
        buttonBottom: this.data.buttonBottom - deltaY,
        startX: adjustedX,
        startY: adjustedY,
        debounceTimer: null // 清空定时器引用
      });
    }, 1); // 防抖时间间隔，可根据需要调整

    // 更新定时器引用
    this.setData({
      debounceTimer: timer,
    });
  },

  // 浮动按钮触摸结束
  onButtonTouchEnd: function () {
    if (this.data.debounceTimer) {
      clearTimeout(this.data.debounceTimer);
      this.setData({
        debounceTimer: null
      });
    }
    this.setData({
      buttonMoving: false
    });
  },

  // 记录页面滚动位置
  onPageScroll: function (e) {
    if (this.data.keyboardHeight > 0)
      return;
    this.setData({
      scrollTop: parseInt(e.scrollTop)
    });
  },

  // 页面卸载时自动保存
  onUnload: function () {
    if (this.data.title || this.data.content) {
      this.saveNote(true);
    }

    // 清除定时器
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
  }
})
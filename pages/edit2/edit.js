// pages/edit2/edit.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    title: '',
    noteTime: '',
    initialContent: '<p>请输入内容...</p>',
    formats: {},
    showColorPicker: false,
    colors: ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'],
    noteId: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 设置当前时间
    this.setNoteTime();
    
    // 如果有noteId参数，说明是编辑现有笔记
    if (options.id) {
      this.setData({
        noteId: options.id
      });
      this.loadNoteData(options.id);
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    this.editor = this.selectComponent('#editor');
  },

  /**
   * 设置笔记时间
   */
  setNoteTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    const timeStr = `${year}年${month}月${day}日 ${hours}:${minutes}`;
    this.setData({
      noteTime: timeStr
    });
  },

  /**
   * 加载笔记数据
   */
  loadNoteData(noteId) {
    // 从本地存储或云端获取笔记数据
    const notes = wx.getStorageSync('notes') || [];
    const note = notes.find(n => n.id === noteId);
    
    if (note) {
      this.setData({
        title: note.title,
        initialContent: note.content,
        noteTime: note.time
      });
    }
  },

  /**
   * 标题输入事件处理
   */
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  /**
   * 保存笔记
   */
  saveNote() {
    const content = this.editor.getContents();
    
    if (!this.data.title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return;
    }
    
    // 准备笔记数据
    const noteData = {
      id: this.data.noteId || Date.now().toString(),
      title: this.data.title,
      content: content,
      time: this.data.noteTime,
      updateTime: new Date().getTime()
    };
    
    // 从本地存储获取现有笔记
    let notes = wx.getStorageSync('notes') || [];
    
    // 如果是编辑现有笔记，更新它
    if (this.data.noteId) {
      const index = notes.findIndex(n => n.id === this.data.noteId);
      if (index !== -1) {
        notes[index] = noteData;
      } else {
        notes.push(noteData);
      }
    } else {
      // 添加新笔记
      notes.push(noteData);
    }
    
    // 保存到本地存储
    wx.setStorageSync('notes', notes);
    
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  /**
   * 处理格式化操作
   */
  handleFormat(e) {
    const { format, value } = e.currentTarget.dataset;
    
    if (format === 'align' || format === 'list') {
      this.editor.format(format, value);
    } else {
      this.editor.format(format);
    }
    
    // 更新格式状态
    this.updateFormats();
  },

  /**
   * 更新格式状态
   */
  updateFormats() {
    const formats = this.editor.getFormats();
    this.setData({ formats });
  },

  /**
   * 显示颜色选择器
   */
  showColorPicker() {
    this.setData({
      showColorPicker: !this.data.showColorPicker
    });
  },

  /**
   * 处理颜色选择
   */
  handleColor(e) {
    const color = e.currentTarget.dataset.color;
    this.editor.format('color', color);
    
    this.setData({
      showColorPicker: false
    });
    
    // 更新格式状态
    this.updateFormats();
  },

  /**
   * 插入图片
   */
  insertImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: res => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.editor.insertImage(tempFilePath);
      }
    });
  },

  /**
   * 撤销操作
   */
  undo() {
    this.editor.undo();
  },

  /**
   * 重做操作
   */
  redo() {
    this.editor.redo();
  }
})
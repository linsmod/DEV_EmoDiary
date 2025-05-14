// pages/edit/edit.js
Page({
  data: {
    id: '',
    title: '',
    content: '',
    isEdit: false,
    autoSaveTimer: null
  },

  onLoad: function (options) {
    // 如果传入了id，说明是编辑现有笔记
    if (options.id) {
      const notes = wx.getStorageSync('notes') || [];
      const note = notes.find(n => n.id === options.id);
      
      if (note) {
        this.setData({
          id: note.id,
          title: note.title,
          content: note.content,
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

  onUnload: function () {
    // 页面卸载时清除定时器
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
  },

  // 标题输入事件
  onTitleInput: function (e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 内容输入事件
  onContentInput: function (e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 自动保存
  autoSave: function () {
    if (this.data.title || this.data.content) {
      this.saveNote(true);
    }
  },

  // 保存笔记
  saveNote: function (isAutoSave = false) {
    const title = this.data.title;
    const content = this.data.content;
    
    // 如果标题和内容都为空，不保存
    if (!title && !content) {
      if (!isAutoSave) {
        wx.showToast({
          title: '笔记内容不能为空',
          icon: 'none'
        });
      }
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
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } else {
      console.log('自动保存成功');
    }
  },

  // 保存按钮点击事件
  onSave: function () {
    this.saveNote();
  }
})
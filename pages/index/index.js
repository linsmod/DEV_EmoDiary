// pages/index/index.js
Page({
  data: {
    notes: [],
    loading: true,
    selectedNotes: [],
    isSelectionMode: false
  },

  onLoad: function (options) {
    this.loadNotes();
  },

  onShow: function () {
    this.loadNotes();
  },

  // 加载所有笔记
  loadNotes: function () {
    const notes = wx.getStorageSync('notes') || [];
    const selectedNotes = this.data.selectedNotes || [];
    
    // 处理笔记内容，将HTML转为纯文本用于预览
    const processedNotes = notes.map(note => {
      let contentText = note.content || '';
      
      // 如果内容是HTML格式，转换为纯文本
      if (contentText.indexOf('<') !== -1 && contentText.indexOf('>') !== -1) {
        // 简单的HTML标签移除
        contentText = contentText.replace(/<[^>]+>/g, '');
        // 处理HTML实体
        contentText = contentText.replace(/&nbsp;/g, ' ');
        contentText = contentText.replace(/&lt;/g, '<');
        contentText = contentText.replace(/&gt;/g, '>');
        contentText = contentText.replace(/&amp;/g, '&');
      }
      
      // 限制预览文本长度
      if (contentText.length > 100) {
        contentText = contentText.substring(0, 100) + '...';
      }
      
      return {
        ...note,
        contentText,
        isSelected: selectedNotes.includes(note.id)
      };
    });
    
    this.setData({
      notes: processedNotes.sort((a, b) => b.updateTime - a.updateTime),
      loading: false,
      isSelectionMode: selectedNotes.length > 0
    });
  },

  // 跳转到创建新笔记页面
  onNewNote: function () {
    wx.navigateTo({
      url: '/pages/edit/edit'
    });
  },

  // 跳转到笔记详情页面
  onViewNote: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: "/pages/detail/detail?id=" + id
    });
  },

  // 删除笔记
  onDeleteNote: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: function (res) {
        if (res.confirm) {
          let notes = wx.getStorageSync('notes') || [];
          notes = notes.filter(note => note.id !== id);
          wx.setStorageSync('notes', notes);
          that.loadNotes();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到搜索页面
  onSearchTap: function() {
    wx.navigateTo({
      url: "/pages/search/search"
    });
  },

  // 长按笔记进入选择模式
  onLongPressNote: function(e) {
    const id = e.currentTarget.dataset.id;
    const notes = this.data.notes.map(note => {
      note.isSelected = note.id === id;
      return note;
    });
    this.setData({
      isSelectionMode: true,
      notes: notes,
      selectedNotes: [id]
    });
  },

  // 切换笔记选中状态
  toggleNoteSelection: function(e) {
    const id = e.currentTarget.dataset.id;
    let selectedNotes = [];
    const notes = this.data.notes.map(note => {
      if (note.id === id) {
        note.isSelected = !note.isSelected;
      }
      if (note.isSelected) {
        selectedNotes.push(note.id);
      }
      return note;
    });
    
    this.setData({
      notes: notes,
      selectedNotes: selectedNotes
    });
  },

  // 批量删除选中的笔记
  onBatchDelete: function() {
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的${this.data.selectedNotes.length}条笔记吗？`,
      success: function (res) {
        if (res.confirm) {
          let notes = wx.getStorageSync('notes') || [];
          notes = notes.filter(note => !that.data.selectedNotes.includes(note.id));
          wx.setStorageSync('notes', notes);
          that.setData({
            selectedNotes: [],
            isSelectionMode: false
          });
          that.loadNotes();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 全选/取消全选笔记
  onSelectAll: function() {
    const isAllSelected = this.data.notes.length === this.data.selectedNotes.length;
    const notes = this.data.notes.map(note => {
      note.isSelected = !isAllSelected;
      return note;
    });
    const selectedNotes = isAllSelected ? [] : notes.map(note => note.id);
    this.setData({
      notes: notes,
      selectedNotes: selectedNotes,
      // isSelectionMode: !isAllSelected || selectedNotes.length > 0
    });
  },

  // 退出选择模式
  exitSelectionMode: function() {
    this.setData({
      notes: this.data.notes.map(note => {
        note.isSelected = false;
        return note;
      }),
      selectedNotes: [],
      isSelectionMode: false
    });
  }
})
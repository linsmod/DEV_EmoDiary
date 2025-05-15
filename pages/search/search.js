// pages/search/search.js
Page({
  data: {
    keyword: '',
    results: [],
    loading: false,
    hasMore: true,
    pageSize: 10,
    currentPage: 0,
    recentSearches: [],
    showRecent: true
  },

  onLoad() {
    this.loadNotes();
    this.loadRecentSearches();
  },

  loadRecentSearches() {
    const searches = wx.getStorageSync('recentSearches') || [];
    this.setData({ recentSearches: searches });
  },

  saveSearchKeyword(keyword) {
    let searches = wx.getStorageSync('recentSearches') || [];
    // 去重
    searches = searches.filter(item => item.keyword !== keyword);
    // 添加到开头
    searches.unshift({
      keyword,
      time: new Date().getTime()
    });
    // 限制数量
    searches = searches.slice(0, 10);
    wx.setStorageSync('recentSearches', searches);
    this.setData({ recentSearches: searches });
  },

  loadNotes() {
    this.notes = wx.getStorageSync('notes') || [];
  },

  onInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ keyword });
    
    // 自动搜索防抖处理
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (keyword) {
        this.setData({
          loading: true,
          results: [],
          currentPage: 0,
          hasMore: true,
          showRecent: false
        });
        this.searchNotes();
        this.saveSearchKeyword(keyword);
      } else {
        this.setData({ 
          results: [],
          showRecent: true 
        });
      }
    }, 300);
  },

  onSearch() {
    if (!this.data.keyword) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
      return;
    }
    this.setData({
      loading: true,
      results: [],
      currentPage: 0,
      hasMore: true
    });
    this.searchNotes();
  },

  searchNotes() {
    const { keyword, pageSize, currentPage } = this.data;
    const start = currentPage * pageSize;
    const end = start + pageSize;
    let matchedNotes = [];

    // 搜索逻辑
    this.notes.forEach(note => {
      // 去除HTML标签获取纯文本
      const plainText = note.content.replace(/<[^>]+>/g, '');
      const regex = new RegExp(keyword, 'gi');
      const matches = [...plainText.matchAll(regex)];

      if (matches.length > 0) {
        // 高亮处理
        let highlightedContent = note.content;
        matches.forEach(match => {
          highlightedContent = highlightedContent.replace(
            new RegExp(match[0], 'g'),
            `<span class="highlight">${match[0]}</span>`
          );
        });

        // 生成预览片段
        const firstMatch = matches[0];
        const previewStart = Math.max(0, firstMatch.index - 20);
        const previewEnd = Math.min(plainText.length, firstMatch.index + keyword.length + 50);
        let previewText = plainText.substring(previewStart, previewEnd);
        if (previewStart > 0) previewText = '...' + previewText;
        if (previewEnd < plainText.length) previewText = previewText + '...';

        // 高亮预览文本
        previewText = previewText.replace(
          regex,
          `<span class="highlight">${keyword}</span>`
        );

        matchedNotes.push({
          id: note.id,
          title: note.title,
          preview: previewText,
          fullContent: highlightedContent,
          matchCount: matches.length,
          firstMatchPos: firstMatch.index
        });
      }
    });

    // 排序: 匹配次数多的在前
    matchedNotes.sort((a, b) => b.matchCount - a.matchCount);

    this.setData({
      results: matchedNotes.slice(0, end),
      loading: false,
      hasMore: end < matchedNotes.length
    });
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ currentPage: this.data.currentPage + 1 }, () => {
      this.searchNotes();
    });
  },

  onItemTap(e) {
    const { id, index } = e.currentTarget.dataset;
    const note = this.data.results[index];
    
    wx.navigateTo({
      url: "/pages/detail/detail?id=" + id + "&highlight=" + this.data.keyword + "&scrollPos=" + note.firstMatchPos,
    });
  },

  onPullDownRefresh() {
    this.onSearch();
    wx.stopPullDownRefresh();
  },

  // 删除单个搜索记录
  removeSearchKeyword(e) {
    const { index } = e.currentTarget.dataset;
    let searches = [...this.data.recentSearches];
    searches.splice(index, 1);
    wx.setStorageSync('recentSearches', searches);
    this.setData({ recentSearches: searches });
    wx.showToast({
      title: '已删除',
      icon: 'none',
      duration: 1000
    });
  },

  // 清空所有搜索记录
  clearRecentSearches() {
    wx.setStorageSync('recentSearches', []);
    this.setData({ recentSearches: [] });
    wx.showToast({
      title: '已清空记录',
      icon: 'none',
      duration: 1000
    });
  }
})
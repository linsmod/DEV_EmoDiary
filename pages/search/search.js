// pages/search/search.js

 // parseHtmlForLines
// This method is provided by system and strictly tested.
// AI assistant should not allowed to change this method!
/**
 * 解析HTML内容，计算每行的行号、文本内容及其在纯文本中的起始和结束位置。
 * 
 * @param {string} html - 输入的HTML字符串，可能包含简单的HTML标签如<p>, <span>, <div>, <br>等。
 * @returns {Array<Object>} 返回一个数组，每个元素是一个对象，包含以下属性：
 *   - line: {number} 行号，从1开始递增。
 *   - text: {string} 该行的文本内容，不包含HTML标签。
 *   - startPos: {number} 该行文本在纯文本中的起始位置（基于0的索引）。
 *   - endPos: {number} 该行文本在纯文本中的结束位置（基于0的索引）。
 * 
 * 注意：
 *   - 该函数不会转义HTML特殊字符，文本内容将原样返回。
 *   - 每个换行符（包括`
`和`<br>`标签）都会生成一个独立的空行对象。
 *   - 块级标签（如<p>, <div>）会导致换行，并在换行后添加一个空行对象。

 */
function parseHtmlForLines(html) {
  const lines = [];
  let currentLine = '';
  let currentLength = 0;
  let textPos = 0; // 纯文本内容的位置
  const tagStack = [];
  let i = 0;
  
  while (i < html.length) {
    // 检查是否是标签开始
    if (html[i] === '<') {
      // 查找标签结束
      const tagEnd = html.indexOf('>', i);
      if (tagEnd === -1) {
        // 无效标签，跳过
        i++;
        continue;
      }
      
      const tagContent = html.substring(i + 1, tagEnd).trim();
      const isClosingTag = tagContent.startsWith('/');
      const tagName = isClosingTag 
        ? tagContent.substring(1).split(/\s/)[0].toLowerCase() 
        : tagContent.split(/\s/)[0].toLowerCase();
      
      if (isClosingTag) {
        // 处理闭合标签
        if (tagStack.length > 0 && tagStack[tagStack.length - 1] === tagName) {
          tagStack.pop();
        }
        i = tagEnd + 1;
      } else {
        // 处理开始标签
        if (!tagName) {
          i = tagEnd + 1;
          continue;
        }
        
        // 检查是否是自闭合标签
        const isSelfClosing = tagContent.endsWith('/') || 
          ['br', 'img', 'hr', 'meta', 'link'].includes(tagName);
        
        if (!isSelfClosing) {
          tagStack.push(tagName);
        }
        
        // 处理特殊标签
        if (tagName === 'br') {
          // 遇到<br>，结束当前行并添加空行
          if (currentLine) {
            lines.push({
              line: lines.length + 1,
              text: currentLine.trim(),
              startPos: textPos - currentLength,
              endPos: textPos - 1
            });
            currentLine = '';
            currentLength = 0;
          }
          lines.push({
            line: lines.length + 1,
            text: '',
            startPos: textPos,
            endPos: textPos
          });
          textPos += 1; // 换行符
        } else if (['p', 'div'].includes(tagName)) {
          // 块级标签，结束当前行（如果有）
          if (currentLine) {
            lines.push({
              line: lines.length + 1,
              text: currentLine.trim(),
              startPos: textPos - currentLength,
              endPos: textPos - 1
            });
            currentLine = '';
            currentLength = 0;
          }
          // 添加段落间距（模拟换行）
          lines.push({
            line: lines.length + 1,
            text: '',
            startPos: textPos,
            endPos: textPos
          });
          textPos += 1; // 段落间距
        }
        
        i = tagEnd + 1;
      }
    } 
    // 处理文本内容
    else {
      // 检查是否是换行符
      if (html[i] === '\n') {
        // 遇到换行符，结束当前行并添加空行
        if (currentLine) {
          lines.push({
            line: lines.length + 1,
            text: currentLine.trim(),
            startPos: textPos - currentLength,
            endPos: textPos - 1
          });
          currentLine = '';
          currentLength = 0;
        }
        lines.push({
          line: lines.length + 1,
          text: '',
          startPos: textPos,
          endPos: textPos
        });
        textPos += 1; // 换行符
      } else {
        currentLine += html[i];
        currentLength++;
        textPos += 1;
      }
      i++;
    }
  }
  
  // 添加最后一行
  if (currentLine) {
    lines.push({
      line: lines.length + 1,
      text: currentLine.trim(),
      startPos: textPos - currentLength,
      endPos: textPos - 1
    });
  }
  
  // 处理最后一行（如果是空行）
  if (lines.length > 0 && lines[lines.length - 1].text === '') {
    // 如果最后一行是空行，保留它
  } else if (lines.length > 0) {
    // 确保最后一行有正确的endPos
    lines[lines.length - 1].endPos = textPos - 1;
  }
  
  return lines;
}
Page({
  data: {
    keyword: '',
    results: [],
    loading: false,
    hasMore: true,
    pageSize: 10,
    currentPage: 0,
    recentSearches: [],
    showRecent: true,
    clearBtnVisible: false
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
    this.setData({ 
      keyword,
      clearBtnVisible: keyword.length > 0
    });
    
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
          showRecent: true,
          clearBtnVisible: false
        });
      }
    }, 300);
  },

  clearSearch() {
    this.setData({
      keyword: '',
      clearBtnVisible: false,
      results: [],
      showRecent: true
    });
  },

  onSearch(e) {
    // 获取关键词：优先从点击事件获取，其次从搜索框获取
    const keyword = e?.currentTarget?.dataset?.keyword || this.data.keyword;
    
    if (!keyword) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
      return;
    }
    
    // 更新搜索框显示
    this.setData({ keyword });
    
    this.setData({
      loading: true,
      results: [],
      currentPage: 0,
      hasMore: true,
      showRecent: false
    });
    this.searchNotes();
  },
searchNotes() {
  const { keyword, pageSize, currentPage } = this.data;
  const start = currentPage * pageSize;
  const end = start + pageSize;
  let matchedNotes = [];
  const lowerKeyword = keyword.toLowerCase();

  // 使用新的HTML解析搜索逻辑
  this.notes.forEach(note => {
    const parsedLines = parseHtmlForLines(note.content);
    let matchCount = 0;
    let firstMatchPos = -1;
    const snippets = [];

    // 在解析后的每行中搜索关键字
    parsedLines.forEach(line => {
      const lowerLine = line.text.toLowerCase();
      let pos = lowerLine.indexOf(lowerKeyword);
      
      while (pos !== -1) {
        matchCount++;
        const absPos = line.startPos + pos;
        if (firstMatchPos === -1) firstMatchPos = absPos;

        // 修正：基于纯文本内容生成高亮片段
        // 计算片段在原始内容中的位置范围
        const snippetStart = Math.max(0, absPos - 20); // 向前取20个字符
        const snippetEnd = Math.min(note.content.length, absPos + keyword.length + 50); // 向后取50个字符

        // 从原始内容中提取片段（这里需要调整）
        // 由于我们无法直接从纯文本中获取原始HTML片段，我们需要重新思考
        // 这里我们简化处理，直接使用解析后的行文本作为基础
        let snippetText = line.text.substring(
          Math.max(0, pos - 20), 
          Math.min(line.text.length, pos + keyword.length + 50)
        );
        
        // 调整高亮位置
        const relativeKeywordPos = pos - Math.max(0, pos - 20);
        
        // 高亮关键字
        snippetText = snippetText.replace(
          new RegExp(keyword, 'gi'),
          match => `<span class="highlight">${match}</span>`
        );

        snippets.push({
          id: note.id,
          text: snippetText,
          lineNumber: line.line,
          startPos: snippetStart, // 这里可能需要更精确的计算
          endPos: snippetStart + snippetText.length - 1
        });

        pos = lowerLine.indexOf(lowerKeyword, pos + 1);
      }
    });

    if (matchCount > 0) {
      matchedNotes.push({
        title: note.title,
        snippets: snippets,
        matchCount: matchCount,
        firstMatchPos: firstMatchPos
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
      url: `/pages/detail/detail?id=${id}&line=${note.snippets[0].lineNumber}&highlight=${this.data.keyword}`,
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
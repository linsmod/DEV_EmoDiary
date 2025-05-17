// 计算纯文本长度（去除HTML标签和特殊字符）
function getTextLength(html) {
  if (!html) return 0;
  
  try {
    // 1. 去除HTML标签
    let text = html.replace(/<[^>]+>/g, '');
    
    // 2. 替换常见HTML实体
    const entities = {
      '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', 
      '&amp;': '&', '&quot;': '"', '&apos;': "'",
      '&#39;': "'", '&#34;': '"', '&#160;': ' ',
      '&ensp;': ' ', '&emsp;': '  '
    };
    
    // 替换所有HTML实体
    text = text.replace(/&[a-z0-9]+;|&#\d+;/gi, match => 
      entities[match] || match
    );
    
    // 3. 去除连续空格和换行，但保留单个空格
    text = text.replace(/\s+/g, ' ').trim();
    
    // 4. 排除零宽空格等特殊字符
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    return text.length;
  } catch (e) {
    console.error('计算字数出错:', e);
    return html.replace(/<[^>]+>/g, '').length; // 出错时返回原始长度
  }
}

module.exports = {
  getTextLength
}
/**
 * WXML 标签配平检查（简易栈式）
 * 用法：node wxml_check.js <file...>
 * 规则：跳过 <!-- --> 注释；自闭合 <tag ... /> 不入栈；其余成对检查。
 */
const fs = require('fs');

const VOID = new Set([]); // 小程序里无 void 元素，全部要求显式 />

function check(file) {
  const src = fs.readFileSync(file, 'utf8');
  // 去注释（保留换行以便报行号）
  const clean = src.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  const stack = [];
  const errors = [];
  let m;
  while ((m = re.exec(clean))) {
    const closing = m[1] === '/';
    const tag = m[2];
    const selfClose = m[4] === '/';
    const line = clean.slice(0, m.index).split('\n').length;
    if (selfClose) continue;
    if (closing) {
      if (!stack.length) {
        errors.push(`第 ${line} 行：</${tag}> 多余（栈已空）`);
        continue;
      }
      const top = stack[stack.length - 1];
      if (top.tag !== tag) {
        errors.push(`第 ${line} 行：</${tag}> 与第 ${top.line} 行 <${top.tag}> 不匹配`);
        // 尝试回溯修复
        const idx = stack.map((s) => s.tag).lastIndexOf(tag);
        if (idx > -1) stack.length = idx;
        continue;
      }
      stack.pop();
    } else {
      stack.push({ tag, line });
    }
  }
  stack.forEach((s) => errors.push(`第 ${s.line} 行：<${s.tag}> 未闭合`));
  return errors;
}

const files = process.argv.slice(2);
let bad = 0;
files.forEach((f) => {
  const errs = check(f);
  if (errs.length) {
    bad += 1;
    console.log(`FAIL  ${f}`);
    errs.forEach((e) => console.log('   ' + e));
  } else {
    console.log(`PASS  ${f}`);
  }
});
process.exit(bad ? 1 : 0);

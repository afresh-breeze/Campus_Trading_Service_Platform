/**
 * request.js 导出完整性 + 置顶真实链路端到端（11-26）
 * 回归 bug：http.patch 定义在 http 对象里但 module.exports 漏导出，
 *          页面 http.patch(...) 抛 TypeError，被 .catch 吞成空对象，置顶静默失效。
 * 本脚本用「真实 config + mock + request」而非 stub，能抓到这类导出遗漏。
 * 运行：node scripts/smoke/smoke_request_export.js   （cwd 必须在仓库根）
 */
const path = require('path');
const REPO = process.cwd();
const MP = path.join(REPO, 'miniprogram');

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log('  PASS  ' + name);
  } else {
    fail += 1;
    console.log('  FAIL  ' + name + (extra === undefined ? '' : ' -> ' + JSON.stringify(extra)));
  }
}

global.wx = {
  getStorageSync: (k) => (k === 'cs_token' ? 'mock_token' : ''),
  setStorageSync: () => {},
  removeStorageSync: () => {},
  showToast: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  request: () => {}
};

const config = require(path.join(MP, 'config.js'));
const http = require(path.join(MP, 'utils/request.js'));

(async () => {
  console.log('[1] request 导出完整性');
  ['request', 'get', 'post', 'put', 'patch', 'del', 'upload'].forEach((m) => {
    check('导出 ' + m, typeof http[m] === 'function', typeof http[m]);
  });

  if (config.MOCK !== true) {
    console.log('\n[skip] config.MOCK=false，跳过 mock 端到端（真后端需启动 3000 服务）');
    console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
    process.exit(fail ? 1 : 0);
  }

  console.log('\n[2] 置顶真实链路（config → request → mock）');
  const before = await http.get('/api/conversations', { page: 1, pageSize: 20 }, { silent: true });
  check('置顶前 3001 不是第一', (before.list || [])[0].conversationId !== 3001, (before.list || []).map((c) => c.conversationId));

  let patchErr = null;
  let patchRes = null;
  try {
    patchRes = await http.patch('/api/conversations/3001/pin', { pinned: true }, { silent: true });
  } catch (e) {
    patchErr = e;
  }
  check('http.patch 调用不抛错', patchErr === null, patchErr);
  check('http.patch 返回 {pinned:true}', patchRes && patchRes.pinned === true, patchRes);

  const after = await http.get('/api/conversations', { page: 1, pageSize: 20 }, { silent: true });
  const first = (after.list || [])[0];
  check('置顶后 3001 排到第一', first && first.conversationId === 3001, (after.list || []).map((c) => c.conversationId));
  check('置顶后 3001.isPinned=true', first && first.isPinned === true, first && first.isPinned);

  console.log('\n[3] 取消置顶真实链路');
  await http.patch('/api/conversations/3001/pin', { pinned: false }, { silent: true });
  const reverted = await http.get('/api/conversations', { page: 1, pageSize: 20 }, { silent: true });
  const row3001 = (reverted.list || []).find((c) => c.conversationId === 3001);
  check('取消置顶后 3001.isPinned=false', row3001 && row3001.isPinned === false, row3001 && row3001.isPinned);

  console.log('\n========== ' + pass + ' 通过 / ' + fail + ' 失败 ==========');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('SMOKE 崩溃:', e);
  process.exit(1);
});

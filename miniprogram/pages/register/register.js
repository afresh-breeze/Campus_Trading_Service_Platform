// 注册页（B 成员）
// 口径：A 的 users 表虽有 campus 列，但注册流程不采集校区，发布也不采集。
// 因此本页不出现任何校区字段，杜绝前后端字段口径冲突。
const http = require('../../utils/request');
const util = require('../../utils/util');

Page({
  data: {
    form: {
      studentNo: '',
      nickname: '',
      password: '',
      password2: ''
    },
    submitting: false
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  validate() {
    const f = this.data.form;
    if (!f.studentNo) return '请输入学号';
    if (!util.REGEX.studentNo.test(f.studentNo)) return '学号应为 6-15 位数字';
    if (!f.nickname || f.nickname.trim().length < 2) return '昵称至少 2 个字符';
    if (!util.REGEX.password.test(f.password)) return '密码需 6-20 位';
    if (f.password !== f.password2) return '两次输入的密码不一致';
    return '';
  },

  async onSubmit() {
    const msg = this.validate();
    if (msg) return util.toast(msg);

    this.setData({ submitting: true });
    try {
      // 只提交后端声明的三个字段，不多传
      const payload = {
        studentNo: this.data.form.studentNo.trim(),
        nickname: this.data.form.nickname.trim(),
        password: this.data.form.password
      };
      const data = await http.post('/api/auth/register', payload);
      const app = getApp();
      app.setSession(data.token, data.userInfo);
      util.toast('注册成功', 'success');
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    } catch (err) {
      // 错误文案已由 request 统一 toast（含后端 message），这里只留日志
      console.warn('注册失败', err);
    } finally {
      this.setData({ submitting: false });
    }
  },

  onGoLogin() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  }
});

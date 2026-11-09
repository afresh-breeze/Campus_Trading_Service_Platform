// 注册页（B 成员）
const http = require('../../utils/request');
const util = require('../../utils/util');

const CAMPUS_LIST = ['东校区', '西校区', '南校区', '北校区'];

Page({
  data: {
    campusList: CAMPUS_LIST,
    campusIndex: 0,
    form: {
      studentNo: '',
      nickname: '',
      campus: '',
      password: '',
      password2: ''
    },
    submitting: false
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  onCampusChange(e) {
    const index = Number(e.detail.value);
    this.setData({ campusIndex: index, 'form.campus': CAMPUS_LIST[index] });
  },

  validate() {
    const f = this.data.form;
    if (!f.studentNo) return '请输入学号';
    if (!util.REGEX.studentNo.test(f.studentNo)) return '学号应为 6-12 位数字';
    if (!f.nickname || f.nickname.trim().length < 2) return '昵称至少 2 个字符';
    if (!f.campus) return '请选择校区';
    if (!util.REGEX.password.test(f.password)) return '密码需 6-20 位';
    if (f.password !== f.password2) return '两次输入的密码不一致';
    return '';
  },

  async onSubmit() {
    const msg = this.validate();
    if (msg) return util.toast(msg);

    this.setData({ submitting: true });
    try {
      const payload = {
        studentNo: this.data.form.studentNo,
        nickname: this.data.form.nickname.trim(),
        campus: this.data.form.campus,
        password: this.data.form.password
      };
      const data = await http.post('/api/auth/register', payload);
      const app = getApp();
      app.setSession(data.token, data.userInfo);
      util.toast('注册成功', 'success');
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 500);
    } catch (err) {
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

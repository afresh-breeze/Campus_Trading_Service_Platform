// 发布商品（A 成员，11-16）
// ------------------------------------------------------------------
// 口径（2026-11-16 定稿）：
//   1. 只做新建，不做编辑；进页未登录直接跳登录页并带 redirect 回跳。
//   2. 图片 0-3 张，选完立即逐张上传；第一张为封面，sortNo 按添加顺序。
//   3. 书籍模式必须关联书目：防抖联想 /api/books/search；无结果可手动新建，
//      发布时先 POST /api/books 再 POST /api/items；手动表单与已选书目互斥，后操作生效。
//   4. 有内容才开启系统返回询问（iOS 侧滑官方不拦），发布成功前先关闭再跳详情。
const http = require('../../utils/request');
const util = require('../../utils/util');
const adapter = require('../../utils/adapter');

const MAX_PRICE = 99999999.99;
const MAX_IMAGES = 3;
const MAX_BOOK_SUGGEST = 5;
const BOOK_CATEGORY = '图书教材';
const PAGE_PATH = '/pages/item/publish';

const CONDITION_OPTIONS = [
  { value: 'new', label: '全新' },
  { value: 'like_new', label: '几乎全新' },
  { value: 'good', label: '成色良好' },
  { value: 'fair', label: '有使用痕迹' }
];
const CONDITION_LABELS = CONDITION_OPTIONS.map((item) => item.label);
const DEFAULT_CONDITION_INDEX = Math.max(
  0,
  CONDITION_OPTIONS.findIndex((item) => item.value === 'good')
);
const PLACE_CHIPS = [
  '桃园',
  '李园',
  '橘园',
  '楠园',
  '梅园',
  '竹园',
  '杏园',
  '茶园',
  '中心图书馆',
  '北区图书馆',
  '南区图书馆'
];

function splitLocation(value) {
  return String(value || '')
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPlaceSelected(tokens) {
  const selected = {};
  tokens.forEach((token) => {
    if (PLACE_CHIPS.indexOf(token) >= 0) selected[token] = true;
  });
  return selected;
}

const ERROR_SELECTORS = [
  ['images', '#field-images'],
  ['title', '#field-title'],
  ['price', '#field-price'],
  ['originalPrice', '#field-original'],
  ['category', '#field-category'],
  ['book', '#field-book'],
  ['manualTitle', '#field-manual-title'],
  ['manualIsbn', '#field-manual-isbn'],
  ['manualAuthor', '#field-manual-author'],
  ['manualPublisher', '#field-manual-publisher']
];

function trim(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/** 金额：空串合法（选填），否则最多两位小数且不超过后端上限 */
function parseMoney(value) {
  const text = trim(value);
  if (!text) return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return { ok: false, error: '金额格式不正确，最多两位小数' };
  }
  const number = Number(text);
  if (!Number.isFinite(number)) return { ok: false, error: '金额格式不正确' };
  if (number > MAX_PRICE) return { ok: false, error: '金额超出范围' };
  return { ok: true, value: number };
}

function mapBook(raw) {
  const book = raw || {};
  const rawCount = book.onSaleCount;
  const countKnown = rawCount !== undefined && rawCount !== null && rawCount !== '';
  const count = countKnown ? adapter.num(rawCount, 0) : null;
  const meta = [book.author, book.publisher].filter(Boolean).join(' · ');
  return {
    bookId: adapter.num(book.bookId, 0),
    title: book.title || '',
    author: book.author || '',
    publisher: book.publisher || '',
    isbn: book.isbn || '',
    metaText: meta || '作者/出版社未知',
    countText: count === null ? '' : count > 0 ? count + ' 件在售' : '暂无在售',
    isbnText: book.isbn ? 'ISBN ' + book.isbn : ''
  };
}

function emptyManualBook() {
  return { title: '', isbn: '', author: '', publisher: '' };
}

Page({
  data: {
    mode: 'normal',
    form: {
      title: '',
      description: '',
      price: '',
      originalPrice: '',
      location: ''
    },
    descCount: 0,
    negotiable: false,
    conditionLabels: CONDITION_LABELS,
    conditionIndex: DEFAULT_CONDITION_INDEX,
    maxImages: MAX_IMAGES,
    placeChips: PLACE_CHIPS,
    placeSelected: {},
    categories: [],
    categoryNames: [],
    categoryIndex: -1,
    categoryId: null,
    categoryName: '',
    categoriesLoading: false,
    categoriesError: '',
    images: [],
    imageUploading: false,
    bookKeyword: '',
    bookFocus: false,
    bookSuggestions: [],
    bookSuggestLoading: false,
    bookSuggestVisible: false,
    bookSuggestError: false,
    bookSelected: null,
    bookManualOpen: false,
    manualBook: emptyManualBook(),
    submitting: false,
    errors: {}
  },

  onLoad() {
    this._dirty = false;
    this._alertOn = false;
    this._loginRedirected = false;
    this._published = false;
    this._bookTimer = null;
    this._bookBlurTimer = null;
    this._bookSeq = 0;
    this._manualBookId = 0;
    this._uploadSeq = 0;
    this._uploadChain = Promise.resolve();

    const app = getApp();
    if (!(app && typeof app.isLogin === 'function' && app.isLogin())) {
      this.redirectToLogin();
      return;
    }
    this.loadCategories();
  },

  onShow() {
    const app = getApp();
    if (
      app &&
      typeof app.isLogin === 'function' &&
      !app.isLogin() &&
      !this._loginRedirected
    ) {
      this.redirectToLogin();
    }
  },

  onUnload() {
    this.clearBookTimers();
    this._bookSeq += 1;
  },

  redirectToLogin() {
    this._loginRedirected = true;
    const app = getApp();
    if (app && typeof app.requireLogin === 'function') {
      app.requireLogin(PAGE_PATH);
      return;
    }
    wx.redirectTo({
      url: '/pages/login/login?redirect=' + encodeURIComponent(PAGE_PATH)
    });
  },

  /** 有内容才开启系统返回询问；一次会话只开一次 */
  markDirty() {
    this._dirty = true;
    if (this._alertOn || typeof wx.enableAlertBeforeUnload !== 'function') return;
    this._alertOn = true;
    wx.enableAlertBeforeUnload({
      message: '离开后已填内容不会保存，确定离开？',
      fail: () => {
        this._alertOn = false;
      }
    });
  },

  disableLeaveAlert() {
    if (!this._alertOn) return;
    this._alertOn = false;
    if (typeof wx.disableAlertBeforeUnload === 'function') {
      wx.disableAlertBeforeUnload({ fail: () => {} });
    }
  },

  // ---------------- 分类 ----------------

  loadCategories() {
    if (this.data.categoriesLoading) return Promise.resolve();
    this.setData({ categoriesLoading: true, categoriesError: '' });
    return http
      .get('/api/categories', {}, { silent: true })
      .then((res) => {
        const list = ((res && res.list) || [])
          .map((item) => ({
            categoryId: adapter.num(item.categoryId, 0),
            name: item.name || ''
          }))
          .filter((item) => item.categoryId && item.name);

        const patch = {
          categories: list,
          categoryNames: list.map((item) => item.name),
          categoriesLoading: false,
          categoriesError: ''
        };
        if (this.data.categoryId) {
          const index = list.findIndex(
            (item) => item.categoryId === this.data.categoryId
          );
          if (index >= 0) {
            patch.categoryIndex = index;
            patch.categoryName = list[index].name;
          } else {
            patch.categoryIndex = -1;
            patch.categoryId = null;
            patch.categoryName = '';
          }
        }
        this.setData(patch);

        if (this._pendingBookCategory) {
          this._pendingBookCategory = false;
          if (this.data.mode === 'book' && this.data.bookSelected) {
            this.applyBookCategory();
          }
        }
      })
      .catch((err) => {
        this.setData({
          categoriesLoading: false,
          categoriesError: (err && err.message) || '分类加载失败'
        });
      });
  },

  onRetryCategories() {
    if (this.data.categories.length) return;
    if (this.data.categoriesLoading) {
      util.toast('分类加载中，请稍候');
      return;
    }
    this.loadCategories();
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value) || 0;
    const category = this.data.categories[index];
    if (!category) return;
    this.setData({
      categoryIndex: index,
      categoryId: category.categoryId,
      categoryName: category.name,
      'errors.category': ''
    });
    this.markDirty();
  },

  /** 书籍模式选中书目后自动切「图书教材」，分类还没加载就等加载完再切 */
  applyBookCategory() {
    if (!this.data.categories.length) {
      this._pendingBookCategory = true;
      return;
    }
    const index = this.data.categories.findIndex(
      (item) => item.name === BOOK_CATEGORY
    );
    if (index < 0) return;
    const category = this.data.categories[index];
    this.setData({
      categoryIndex: index,
      categoryId: category.categoryId,
      categoryName: category.name,
      'errors.category': ''
    });
  },

  // ---------------- 普通字段 ----------------

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    const value = (e.detail && e.detail.value) || '';
    const patch = {};
    patch['form.' + field] = value;
    patch['errors.' + field] = '';
    if (field === 'description') patch.descCount = value.length;
    if (field === 'location') patch.placeSelected = buildPlaceSelected(splitLocation(value));
    this.setData(patch);
    this.markDirty();
  },

  onConditionChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({ conditionIndex: index });
    this.markDirty();
  },

  onNegotiableChange(e) {
    this.setData({ negotiable: !!e.detail.value });
    this.markDirty();
  },

  onPlaceChip(e) {
    const place = e.currentTarget.dataset.place;
    if (!place) return;
    const tokens = splitLocation(this.data.form.location).filter(
      (token, index, list) => list.indexOf(token) === index
    );
    const index = tokens.indexOf(place);
    if (index >= 0) tokens.splice(index, 1);
    else tokens.push(place);
    this.setData({
      'form.location': tokens.join('，'),
      placeSelected: buildPlaceSelected(tokens),
      'errors.location': ''
    });
    this.markDirty();
  },

  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.mode) return;
    this.setData({
      mode,
      bookSuggestVisible: false,
      'errors.book': '',
      'errors.manualTitle': '',
      'errors.manualIsbn': '',
      'errors.manualAuthor': '',
      'errors.manualPublisher': ''
    });
  },

  // ---------------- 图片 ----------------

  onChooseImages() {
    if (this.data.submitting) return;
    const remain = MAX_IMAGES - this.data.images.length;
    if (remain <= 0) {
      util.toast('最多上传 3 张图片');
      return;
    }
    if (typeof wx.chooseMedia !== 'function') {
      util.toast('当前微信版本不支持选择图片');
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = ((res && res.tempFiles) || []).slice(
          0,
          MAX_IMAGES - this.data.images.length
        );
        const next = files
          .map((file) => {
            const path = file.tempFilePath || file.path || '';
            this._uploadSeq += 1;
            return {
              id: 'img-' + Date.now() + '-' + this._uploadSeq,
              tempPath: path,
              url: '',
              displayUrl: path,
              status: 'uploading',
              error: ''
            };
          })
          .filter((item) => item.tempPath);

        if (!next.length) return;
        this.setData({
          images: this.data.images.concat(next),
          'errors.images': ''
        });
        this.markDirty();
        this.enqueueUploads(next);
      },
      fail: (err) => {
        if (!/cancel/i.test((err && err.errMsg) || '')) {
          util.toast('选择图片失败，请重试');
        }
      }
    });
  },

  enqueueUploads(items) {
    this.setData({ imageUploading: true });
    items.forEach((item) => {
      this._uploadChain = this._uploadChain
        .then(() => this.uploadImage(item.id))
        .catch(() => {});
    });
    this._uploadChain.then(() => this.syncUploading());
  },

  uploadImage(id) {
    const image = this.data.images.find((item) => item.id === id);
    if (!image || image.status === 'done') return Promise.resolve();
    this.patchImage(id, { status: 'uploading', error: '' });
    return http
      .upload(image.tempPath)
      .then((res) => {
        const url = res && res.url ? res.url : '';
        if (!url) throw new Error('上传失败');
        this.patchImage(id, {
          status: 'done',
          url,
          displayUrl: adapter.fullUrl(url)
        });
        this.setData({ 'errors.images': '' });
      })
      .catch((err) => {
        this.patchImage(id, {
          status: 'failed',
          error: (err && err.message) || '上传失败'
        });
      });
  },

  patchImage(id, patch) {
    const images = this.data.images.map((item) =>
      item.id === id ? Object.assign({}, item, patch) : item
    );
    this.setData({ images });
  },

  syncUploading() {
    const uploading = this.data.images.some(
      (item) => item.status === 'uploading'
    );
    if (uploading !== this.data.imageUploading) {
      this.setData({ imageUploading: uploading });
    }
  },

  onImageTap(e) {
    const id = e.currentTarget.dataset.id;
    const image = this.data.images.find((item) => item.id === id);
    if (!image) return;
    if (image.status === 'failed') {
      this.setData({ imageUploading: true });
      this.uploadImage(id).then(() => this.syncUploading());
      return;
    }
    if (image.status !== 'done' || !image.url) return;
    const done = this.data.images.filter(
      (item) => item.status === 'done' && item.url
    );
    wx.previewImage({
      current: adapter.fullUrl(image.url),
      urls: done.map((item) => adapter.fullUrl(item.url))
    });
  },

  onDeleteImage(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({
      images: this.data.images.filter((item) => item.id !== id),
      'errors.images': ''
    });
    this.markDirty();
    this.syncUploading();
  },

  // ---------------- 书籍书目 ----------------

  onBookKeywordInput(e) {
    const value = (e.detail && e.detail.value) || '';
    const keyword = value.trim();
    this.setData({
      bookKeyword: value,
      bookSuggestError: false,
      'errors.book': ''
    });
    this.markDirty();

    if (!keyword) {
      this.clearBookTimer();
      this._bookSeq += 1;
      this.clearBookBlurTimer();
      this.setData({
        bookSuggestions: [],
        bookSuggestLoading: false,
        bookSuggestVisible: false,
        bookSuggestError: false
      });
      return;
    }

    this.setData({
      bookSuggestions: [],
      bookSuggestVisible: true,
      bookSuggestLoading: true,
      bookSuggestError: false
    });
    this.scheduleBookSearch(keyword);
  },

  onBookKeywordFocus() {
    const keyword = this.data.bookKeyword.trim();
    if (!keyword) return;
    this.clearBookBlurTimer();
    this.setData({ bookSuggestVisible: true });
    if (!this.data.bookSuggestions.length && !this.data.bookSuggestLoading) {
      this.setData({ bookSuggestLoading: true });
      this.scheduleBookSearch(keyword);
    }
  },

  onBookKeywordBlur() {
    this.clearBookBlurTimer();
    this._bookBlurTimer = setTimeout(() => {
      this._bookBlurTimer = null;
      if (this.data.bookSuggestVisible) {
        this.setData({ bookSuggestVisible: false });
      }
    }, 220);
  },

  onBookKeywordConfirm() {
    const keyword = this.data.bookKeyword.trim();
    if (!keyword) return;
    if (wx.hideKeyboard) {
      try {
        wx.hideKeyboard();
      } catch (e) {
        // 键盘未弹起时忽略
      }
    }
    this.clearBookTimer();
    this.setData({ bookSuggestVisible: true, bookSuggestLoading: true });
    this.fetchBookSuggestions(keyword);
  },

  scheduleBookSearch(keyword) {
    this.clearBookTimer();
    this._bookTimer = setTimeout(() => {
      this._bookTimer = null;
      this.fetchBookSuggestions(keyword);
    }, 300);
  },

  fetchBookSuggestions(keyword) {
    const seq = (this._bookSeq += 1);
    return http
      .get('/api/books/search', { keyword }, { silent: true })
      .then((res) => {
        if (seq !== this._bookSeq) return;
        const books = ((res && res.list) || [])
          .map(mapBook)
          .filter((book) => book.bookId)
          .slice(0, MAX_BOOK_SUGGEST);
        const patch = {
          bookSuggestions: books,
          bookSuggestLoading: false,
          bookSuggestError: false
        };
        if (
          !books.length &&
          !this.data.bookSelected &&
          !this.data.bookManualOpen
        ) {
          patch.bookManualOpen = true;
          this._manualBookId = 0;
        }
        this.setData(patch);
      })
      .catch(() => {
        if (seq !== this._bookSeq) return;
        this.setData({ bookSuggestLoading: false, bookSuggestError: true });
      });
  },

  clearBookTimer() {
    if (this._bookTimer) {
      clearTimeout(this._bookTimer);
      this._bookTimer = null;
    }
  },

  clearBookBlurTimer() {
    if (this._bookBlurTimer) {
      clearTimeout(this._bookBlurTimer);
      this._bookBlurTimer = null;
    }
  },

  clearBookTimers() {
    this.clearBookTimer();
    this.clearBookBlurTimer();
  },

  onBookSelect(e) {
    const bookId = Number(e.currentTarget.dataset.id || 0);
    const book = this.data.bookSuggestions.find(
      (item) => item.bookId === bookId
    );
    if (!book) return;

    this.clearBookTimers();
    this._bookSeq += 1;
    this._manualBookId = 0;

    const patch = {
      bookSelected: {
        bookId: book.bookId,
        title: book.title,
        metaText: book.metaText,
        isbnText: book.isbnText
      },
      bookKeyword: book.title,
      bookFocus: false,
      bookSuggestions: [],
      bookSuggestLoading: false,
      bookSuggestVisible: false,
      bookSuggestError: false,
      bookManualOpen: false,
      manualBook: emptyManualBook(),
      'errors.book': '',
      'errors.manualTitle': '',
      'errors.manualIsbn': '',
      'errors.manualAuthor': '',
      'errors.manualPublisher': ''
    };
    if (!trim(this.data.form.title)) {
      patch['form.title'] = book.title;
    }
    this.setData(patch);
    this.markDirty();
    this.applyBookCategory();
  },

  onChangeBook() {
    this.clearBookSelection();
    this.setData({ bookFocus: true });
  },

  onClearBookSelection() {
    this.clearBookSelection();
  },

  clearBookSelection() {
    this.clearBookTimers();
    this._bookSeq += 1;
    this._manualBookId = 0;
    this._pendingBookCategory = false;
    this.setData({
      bookSelected: null,
      bookKeyword: '',
      bookFocus: false,
      bookSuggestions: [],
      bookSuggestLoading: false,
      bookSuggestVisible: false,
      bookSuggestError: false,
      'errors.book': ''
    });
  },

  onBookFocusDone() {
    if (this.data.bookFocus) this.setData({ bookFocus: false });
  },

  onOpenManualBook() {
    this.clearBookTimers();
    this._bookSeq += 1;
    this._manualBookId = 0;
    this._pendingBookCategory = false;
    this.setData({
      bookSelected: null,
      bookManualOpen: true,
      bookSuggestions: [],
      bookSuggestLoading: false,
      bookSuggestVisible: false,
      bookSuggestError: false,
      manualBook: emptyManualBook(),
      'errors.book': '',
      'errors.manualTitle': '',
      'errors.manualIsbn': '',
      'errors.manualAuthor': '',
      'errors.manualPublisher': ''
    });
  },

  onCloseManualBook() {
    this._manualBookId = 0;
    this.setData({
      bookManualOpen: false,
      manualBook: emptyManualBook(),
      'errors.manualTitle': '',
      'errors.manualIsbn': '',
      'errors.manualAuthor': '',
      'errors.manualPublisher': ''
    });
  },

  onManualBookInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this._manualBookId = 0;
    const errorKey =
      'errors.manual' + field.charAt(0).toUpperCase() + field.slice(1);
    const patch = {};
    patch['manualBook.' + field] = (e.detail && e.detail.value) || '';
    patch[errorKey] = '';
    this.setData(patch);
    this.markDirty();
  },

  // ---------------- 提交 ----------------

  validate() {
    const errors = {};
    const form = this.data.form;

    const title = trim(form.title);
    if (!title) errors.title = '请输入商品标题';
    else if (title.length > 100) errors.title = '标题不能超过 100 字';

    const price = parseMoney(form.price);
    if (!trim(form.price)) errors.price = '请输入售价';
    else if (!price.ok) errors.price = price.error;
    else if (price.value <= 0) errors.price = '售价必须大于 0';

    if (trim(form.originalPrice)) {
      const original = parseMoney(form.originalPrice);
      if (!original.ok) errors.originalPrice = original.error;
    }

    if (!this.data.categoryId) errors.category = '请选择商品分类';

    if (this.data.mode === 'book' && !this.data.bookSelected) {
      if (!this.data.bookManualOpen) {
        errors.book = '请选择已有书目，或手动新建书目';
      } else {
        const manual = this.data.manualBook;
        if (!trim(manual.title)) errors.manualTitle = '请输入书名';
        else if (trim(manual.title).length > 200) {
          errors.manualTitle = '书名不能超过 200 字';
        }
        if (trim(manual.isbn).length > 20) {
          errors.manualIsbn = 'ISBN 不能超过 20 位';
        }
        if (trim(manual.author).length > 100) {
          errors.manualAuthor = '作者不能超过 100 字';
        }
        if (trim(manual.publisher).length > 100) {
          errors.manualPublisher = '出版社不能超过 100 字';
        }
      }
    }

    const uploading = this.data.images.some(
      (image) => image.status === 'uploading'
    );
    const failed = this.data.images.some((image) => image.status === 'failed');
    if (uploading) errors.images = '图片上传中，请稍候';
    else if (failed) errors.images = '有图片上传失败，请重试或删除后再发布';

    return errors;
  },

  buildPayload() {
    const form = this.data.form;
    const condition =
      CONDITION_OPTIONS[this.data.conditionIndex] ||
      CONDITION_OPTIONS[DEFAULT_CONDITION_INDEX];
    const images = this.data.images
      .filter((image) => image.status === 'done' && image.url)
      .map((image, index) => ({ url: image.url, sortNo: index + 1 }));
    const original = parseMoney(form.originalPrice);

    return {
      itemType: this.data.mode === 'book' ? 'book' : 'normal',
      categoryId: this.data.categoryId,
      bookId:
        this.data.mode === 'book' && this.data.bookSelected
          ? this.data.bookSelected.bookId
          : null,
      title: trim(form.title),
      description: trim(form.description),
      price: Number(form.price),
      originalPrice: trim(form.originalPrice) ? original.value : null,
      conditionLevel: condition.value,
      negotiable: !!this.data.negotiable,
      location: trim(form.location),
      images
    };
  },

  /** 手动新建书目：发布时先建书目；失败重试复用已建 bookId，避免重复建书 */
  prepareBook(payload) {
    if (this.data.mode !== 'book' || this.data.bookSelected) {
      return Promise.resolve(payload);
    }
    if (!this.data.bookManualOpen) return Promise.resolve(payload);
    if (this._manualBookId) {
      payload.bookId = this._manualBookId;
      return Promise.resolve(payload);
    }

    const manual = this.data.manualBook;
    return http
      .post('/api/books', {
        title: trim(manual.title),
        isbn: trim(manual.isbn) || null,
        author: trim(manual.author) || null,
        publisher: trim(manual.publisher) || null
      })
      .then((res) => {
        const bookId = adapter.num(res && res.bookId, 0);
        if (!bookId) {
          util.toast('书目创建失败，请重试');
          throw new Error('书目创建失败');
        }
        this._manualBookId = bookId;
        payload.bookId = bookId;
        if (res && res.created === false) {
          util.toast('ISBN 已存在，已关联已有书目');
        }
        return payload;
      });
  },

  onSubmit() {
    if (this._published || this.data.submitting) return;

    const app = getApp();
    if (!(app && typeof app.isLogin === 'function' && app.isLogin())) {
      this.redirectToLogin();
      return;
    }
    if (this.data.imageUploading) {
      util.toast('图片上传中，请稍候');
      return;
    }
    if (this.data.categoriesLoading && !this.data.categories.length) {
      util.toast('分类加载中，请稍候');
      return;
    }
    if (wx.hideKeyboard) {
      try {
        wx.hideKeyboard();
      } catch (e) {
        // 键盘未弹起时忽略
      }
    }
    this.clearBookTimers();
    this.setData({ bookSuggestVisible: false });

    const errors = this.validate();
    if (Object.keys(errors).length) {
      this.setData({ errors });
      this.scrollToError(errors);
      return;
    }

    this.setData({ submitting: true, errors: {} });
    const payload = this.buildPayload();

    this.prepareBook(payload)
      .then((body) => http.post('/api/items', body))
      .then((res) => {
        const itemId = adapter.num(res && res.itemId, 0);
        if (!itemId) {
          this.setData({ submitting: false });
          util.toast('发布失败，请重试');
          return;
        }
        this._published = true;
        this.disableLeaveAlert();
        util.toast('发布成功');
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/item/detail?id=' + itemId,
            fail: () => wx.switchTab({ url: '/pages/index/index' })
          });
        }, 500);
      })
      .catch(() => {
        this.setData({ submitting: false });
      });
  },

  scrollToError(errors) {
    const target = ERROR_SELECTORS.find((item) => errors[item[0]]);
    if (!target) return;
    wx.pageScrollTo({
      selector: target[1],
      offsetTop: -120,
      duration: 250,
      fail: () => wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    });
  }
});
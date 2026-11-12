const CARD_FIELDS = `itemId, sellerId, sellerNickname, sellerAvatar, sellerCreditScore,
  categoryId, categoryName,
  bookId, bookTitle, itemType, title, description, price, originalPrice,
  conditionLevel, negotiable, location, status, viewCount, favoriteCount,
  createdAt, firstImage`;

const ITEM_STATUSES = ['on_sale', 'reserved', 'sold', 'off_shelf'];
const ITEM_TYPES = ['normal', 'book'];
const CONDITION_LEVELS = ['new', 'like_new', 'good', 'fair'];
const MAX_PRICE = 99999999.99;

const STATUS_TRANSITIONS = {
  on_sale: ['reserved', 'sold', 'off_shelf'],
  reserved: ['on_sale', 'sold'],
  off_shelf: ['on_sale'],
  sold: []
};

function readTrimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }
  return null;
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : parsePositiveInt(query.page);
  const pageSize = query.pageSize === undefined ? 10 : parsePositiveInt(query.pageSize);
  if (!page || !pageSize || pageSize > 50) {
    return null;
  }
  return { page, pageSize };
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseBoolean(value) {
  if (value === undefined || value === null) {
    return false;
  }
  if (value === true || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 0 || value === '0') {
    return false;
  }
  return null;
}

function escapeLike(value) {
  return value.replace(/[!%_]/g, (char) => `!${char}`);
}

function mapItemCard(row) {
  return {
    itemId: row.itemId,
    sellerId: row.sellerId,
    sellerNickname: row.sellerNickname,
    sellerAvatar: row.sellerAvatar,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    bookId: row.bookId,
    bookTitle: row.bookTitle,
    itemType: row.itemType,
    title: row.title,
    description: row.description,
    price: row.price,
    originalPrice: row.originalPrice,
    conditionLevel: row.conditionLevel,
    negotiable: row.negotiable === 1,
    location: row.location,
    status: row.status,
    viewCount: row.viewCount,
    favoriteCount: row.favoriteCount,
    createdAt: row.createdAt,
    firstImage: row.firstImage
  };
}

module.exports = {
  CARD_FIELDS,
  ITEM_STATUSES,
  ITEM_TYPES,
  CONDITION_LEVELS,
  MAX_PRICE,
  STATUS_TRANSITIONS,
  readTrimmed,
  parsePositiveInt,
  parsePagination,
  toNumber,
  parseBoolean,
  escapeLike,
  mapItemCard
};

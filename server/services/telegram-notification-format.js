'use strict';
const EVENT_LABELS = Object.freeze({ 'order.created': '新订单', 'order.settled': '收款确认', 'order.refunded': '退款完成' });
function safeField(value, maxLength = 80) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatTelegramBusinessNotification(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('Telegram 业务事件无效');
  const label = EVENT_LABELS[event.type];
  if (!label) throw new TypeError('不支持的 Telegram 业务事件');
  const store = safeField(event.storeName, 80), orderNo = safeField(event.orderNo, 40);
  if (!store || !orderNo) throw new TypeError('业务事件缺少必要标识');
  const lines = ['🍽️ <b>FoodFlow · ' + label + '</b>', '━━━━━━━━━━━━━━━━━━',
    '🏪 <b>门店</b>：' + escapeHtml(store), '🧾 <b>订单</b>：<code>' + escapeHtml(orderNo) + '</code>'];
  if (event.type === 'order.created') {
    const note = safeField(event.note, 200);
    if (note) lines.push('📝 <b>顾客备注</b>：\n<blockquote>' + escapeHtml(note) + '</blockquote>');
  }
  if (event.type === 'order.created' || event.type === 'order.settled') {
    const amount = Number(event.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 99999999) throw new TypeError('业务事件金额无效');
    const currency = safeField(event.currency || 'USD', 8);
    if (!/^[A-Z]{3,8}$/.test(currency)) throw new TypeError('业务事件币种无效');
    lines.push('💰 <b>金额</b>：<b>' + amount.toFixed(2) + ' ' + currency + '</b>');
  }
  if (event.type === 'order.refunded') {
    const amount = Number(event.refundAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999) throw new TypeError('退款金额无效');
    const currency = safeField(event.currency || 'USD', 8);
    if (!/^[A-Z]{3,8}$/.test(currency)) throw new TypeError('业务事件币种无效');
    lines.push('↩️ <b>退款金额</b>：<b>' + amount.toFixed(2) + ' ' + currency + '</b>');
  }
  lines.push('━━━━━━━━━━━━━━━━━━', '<i>FoodFlow · 智能订单通知</i>');
  return lines.join('\n');
}
module.exports = { formatTelegramBusinessNotification, escapeHtml };

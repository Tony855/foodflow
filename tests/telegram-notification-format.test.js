'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTelegramBusinessNotification } = require('../server/services/telegram-notification-format');

test('formats allowlisted order events with bounded fields only', () => {
  assert.equal(
    formatTelegramBusinessNotification({
      type: 'order.created', storeName: 'Phnom Penh', orderNo: '11001', tableName: 'A-08',
      amount: 12.5, currency: 'USD', customerToken: 'must-not-appear',
      note: '不要香菜、少辣'
    }),
    `🍽️ <b>FoodFlow · 新订单</b>
━━━━━━━━━━━━━━━━━━
🏪 <b>门店</b>：Phnom Penh
🧾 <b>订单</b>：<code>11001</code>
🪑 <b>桌号</b>：A-08
📝 <b>顾客备注</b>：
<blockquote>不要香菜、少辣</blockquote>
💰 <b>金额</b>：<b>12.50 USD</b>
━━━━━━━━━━━━━━━━━━
<i>FoodFlow · 智能订单通知</i>`
  );
  assert.equal(
    formatTelegramBusinessNotification({
      type: 'order.settled', storeName: 'Store A', orderNo: '11002', tableName: 'B-03',
      amount: 20, currency: 'KHR'
    }).includes('customerToken'),
    false
  );
});

test('formats refund amount without exposing reason or notes', () => {
  const message = formatTelegramBusinessNotification({
    type: 'order.refunded', storeName: 'Store B', orderNo: '11003', tableName: 'VIP-2',
    refundAmount: 4.25, currency: 'USD', reason: 'private reason', note: 'private note'
  });
  assert.match(message, /<b>桌号<\/b>：VIP-2/);
  assert.match(message, /<b>退款金额<\/b>：<b>4\.25 USD<\/b>/);
  assert.equal(message.includes('private'), false);
});

test('rejects unknown event types, missing identifiers and invalid amounts', () => {
  assert.throws(() => formatTelegramBusinessNotification({ type: 'order.unknown' }), /不支持/);
  assert.throws(() => formatTelegramBusinessNotification({
    type: 'order.created', storeName: 'A', orderNo: '1', amount: -1, currency: 'USD'
  }), /金额无效/);
  assert.throws(() => formatTelegramBusinessNotification({
    type: 'order.refunded', storeName: 'A', orderNo: '1', refundAmount: 0, currency: 'USD'
  }), /退款金额无效/);
});

test('strips control characters and bounds untrusted display values', () => {
  const message = formatTelegramBusinessNotification({
    type: 'order.created', storeName: 'A\n[Injected]', orderNo: '1\u0000',
    amount: 1, currency: 'USD'
  });
  assert.equal(message.includes('\n[Injected]'), false);
  assert.equal(message.includes('\u0000'), false);
});

test('escapes HTML in untrusted store and customer note fields', () => {
  const message = formatTelegramBusinessNotification({
    type: 'order.created', storeName: '<b>Store</b> & Co', orderNo: '11<5',
    amount: 8.5, currency: 'USD', note: '<b>注入</b> & 不要辣'
  });
  assert.match(message, /&lt;b&gt;Store&lt;\/b&gt; &amp; Co/);
  assert.match(message, /&lt;b&gt;注入&lt;\/b&gt; &amp; 不要辣/);
  assert.equal(message.includes('<b>注入</b>'), false);
});


test('escapes table names and omits table line when unavailable', () => {
  const withTable = formatTelegramBusinessNotification({
    type: 'order.created', storeName: 'A', orderNo: '1', tableName: '<VIP & 2>', amount: 1, currency: 'USD'
  });
  assert.ok(withTable.includes('<b>桌号</b>：&lt;VIP &amp; 2&gt;'));
  const withoutTable = formatTelegramBusinessNotification({
    type: 'order.created', storeName: 'A', orderNo: '2', amount: 1, currency: 'USD'
  });
  assert.equal(withoutTable.includes('桌号'), false);
});

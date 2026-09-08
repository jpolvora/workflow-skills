'use strict';

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRetry(url, options = {}, { attempts = 3, delay = 500, fetchImpl = fetch } = {}) {
  let last;
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetchImpl(url, options);
      if (response.ok || !RETRY_STATUS.has(response.status) || index === attempts - 1) {
        return response;
      }
      last = new Error(`HTTP ${response.status}`);
    } catch (error) {
      last = error;
      if (index === attempts - 1) throw error;
    }
    await sleep(delay * (2 ** index));
  }
  throw last;
}

module.exports = { fetchRetry, RETRY_STATUS };

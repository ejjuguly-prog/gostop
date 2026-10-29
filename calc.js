// 고스톱 3-5-7 점수 계산 (화면과 무관한 순수 함수 — 브라우저·Node 공용)
(function (root) {
  'use strict';

  var UNIT = 1000;        // 3점 기본금, 이후 홀수 점수마다 이만큼 증가
  var PPEOK_UNIT = 1000;  // 첫뻑: 나머지 사람이 1인당 내는 돈
  var MIN_SCORE = 3;      // 이 점수 미만 = 나가리(금액 없음)

  // 입력 정규화 — 저장값이 문자열·소수·범위 밖이어도 모든 함수가 같은 해석을 하도록
  function toInt(v) { var x = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return Number.isInteger(x) ? x : NaN; }
  function toIdx(v, n) { var x = toInt(v); return x >= 0 && x < n ? x : null; }          // 사람 index (아니면 null)
  function toCount(v) { var x = Number(v); return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0; } // 고·흔들기 횟수

  // 3·4점 1천, 5·6점 2천, 7·8점 3천 … (짝수는 바로 아래 홀수로 인정)
  function baseAmount(score) {
    score = toInt(score);
    if (!Number.isInteger(score) || score < MIN_SCORE) return 0;
    return Math.floor((score - 1) / 2) * UNIT;
  }

  /**
   * 최종 점수 = (기본 점수 + 고 횟수) × 고 배수 × 흔들기 배수
   *   고: 1고 +1, 2고 +2, 3고부터 추가로 ×2 (3고 ×2, 4고 ×4, 5고 ×8 …)
   *   흔들기·폭탄: 1번마다 ×2
   * 기본 점수가 3점 미만이면 고를 할 수 없으므로 그대로 둔다(나가리).
   */
  function finalScore(score, go, shake) {
    score = toInt(score); go = toCount(go); shake = toCount(shake);
    if (!Number.isInteger(score) || score < MIN_SCORE) return score;
    var goMult = go >= 3 ? Math.pow(2, go - 2) : 1;
    return (score + go) * goMult * Math.pow(2, shake);
  }

  // 박 1개마다 2배 (피박+광박 = 4배)
  function bakCount(flags) {
    flags = flags || {};
    return (flags.pi ? 1 : 0) + (flags.gwang ? 1 : 0) + (flags.meong ? 1 : 0);
  }

  /**
   * 한 판 계산.
   * game = {
   *   players: [이름…] (3명),
   *   winner:  승자 index | null(나가리),
   *   score:   기본 점수(고·흔들기 빼고 딴 점수),
   *   go:      승자의 고 횟수 (생략 시 0 — 예전 기록은 score 가 최종 점수),
   *   shake:   승자의 흔들기·폭탄 횟수 (생략 시 0),
   *   bak:     { [패자 index]: {pi, gwang, meong} },
   *   dokbak:  독박 패자 index | null,
   *   ppeok:   첫뻑한 사람 index 배열 (한 판에 여러 명 가능, 1인 1회) — 예전 기록의 단일 index·null 도 허용,
   *   mult:    판돈 배수 (나가리 다음 판 = 2, 연속이면 4·8…) — 생략 시 1
   * }
   * 반환: { amounts, winAmounts, ppeokAmounts, base, mult, nagari, final } — 각 금액 합계는 항상 0
   */
  function calcGame(game) {
    var n = game.players.length;
    var amounts = new Array(n).fill(0);
    var base = 0;
    var mult = game.mult || 1;
    var w = toIdx(game.winner, n);
    var nagari = w == null || baseAmount(game.score) === 0;
    var final = finalScore(game.score, game.go, game.shake);

    if (!nagari) {
      base = baseAmount(final) * mult;
      var losers = [];
      for (var i = 0; i < n; i++) if (i !== w) losers.push(i);

      // 패자별 몫 = 기본금 × 2^박개수
      var share = {};
      losers.forEach(function (l) {
        share[l] = base * Math.pow(2, bakCount((game.bak || {})[l]));
      });

      var d = toIdx(game.dokbak, n);
      if (d != null && d !== w && losers.indexOf(d) >= 0) {
        // 독박(A안): 독박자가 모든 패자 몫(각자의 박 포함)을 혼자 낸다
        var all = losers.reduce(function (s, l) { return s + share[l]; }, 0);
        amounts[d] -= all;
        amounts[w] += all;
      } else {
        losers.forEach(function (l) {
          amounts[l] -= share[l];
          amounts[w] += share[l];
        });
      }
    }

    // 첫뻑: 승패·나가리 배수와 별개로 나머지 전원이 1천원씩 (승패 금액과 따로 보관 — 화면에서 승자가 둘로 보이지 않게)
    var ppeokAmounts = new Array(n).fill(0);
    ppeokList(game.ppeok).forEach(function (p) {
      if (p < 0 || p >= n) return;
      for (var j = 0; j < n; j++) {
        if (j === p) continue;
        ppeokAmounts[j] -= PPEOK_UNIT;
        ppeokAmounts[p] += PPEOK_UNIT;
      }
    });

    var winAmounts = amounts;
    var total = winAmounts.map(function (a, i) { return a + ppeokAmounts[i]; });
    [winAmounts, ppeokAmounts].forEach(function (arr) {
      var sum = arr.reduce(function (s, a) { return s + a; }, 0);
      if (sum !== 0) throw new Error('검산 실패: 합계 ' + sum); // 조용히 틀리지 않게
    });

    // amounts = 최종(승패+첫뻑), winAmounts = 승패만, ppeokAmounts = 첫뻑만
    return { amounts: total, winAmounts: winAmounts, ppeokAmounts: ppeokAmounts, base: base, mult: mult, nagari: nagari, final: nagari ? 0 : final };
  }

  // 첫뻑 값 정규화: null·단일 index·배열 → 중복 없는 index 배열
  function ppeokList(v) {
    var arr = v == null ? [] : Array.isArray(v) ? v : [v];
    arr = arr.map(toInt);
    return arr.filter(function (x, i) { return Number.isInteger(x) && arr.indexOf(x) === i; });
  }

  function isNagari(game) {
    var n = game.players && game.players.length ? game.players.length : 3;
    return toIdx(game.winner, n) == null || baseAmount(game.score) === 0;
  }

  // 판 순서대로 계산: 직전까지 연속된 나가리 수만큼 2배씩 (승자가 나오면 1배로 초기화)
  function calcSession(games) {
    var streak = 0;
    return games.map(function (g) {
      var r = calcGame(Object.assign({}, g, { mult: Math.pow(2, streak) }));
      streak = r.nagari ? streak + 1 : 0;
      return r;
    });
  }

  // 사람별 승·패 횟수: 승 = 그 판 승자, 패 = 승자가 있는 판의 나머지(독박 포함). 나가리는 셈하지 않음
  function winLoss(games, n) {
    var wl = [];
    for (var i = 0; i < n; i++) wl.push({ w: 0, l: 0 });
    games.forEach(function (g) {
      var w = toIdx(g.winner, n);
      if (w == null || baseAmount(g.score) === 0) return;
      for (var j = 0; j < n; j++) { if (j === w) wl[j].w++; else wl[j].l++; }
    });
    return wl;
  }

  // 다음에 입력할 판의 배수
  function nextMult(games) {
    var streak = 0;
    games.forEach(function (g) { streak = isNagari(g) ? streak + 1 : 0; });
    return Math.pow(2, streak);
  }

  var api = { winLoss: winLoss, finalScore: finalScore, baseAmount: baseAmount, bakCount: bakCount, calcGame: calcGame, calcSession: calcSession, nextMult: nextMult, isNagari: isNagari, ppeokList: ppeokList, PPEOK_UNIT: PPEOK_UNIT, MIN_SCORE: MIN_SCORE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GoStop = api;
})(this);

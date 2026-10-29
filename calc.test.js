// 실행: node calc.test.js
// 기준값 = 전진표 엑셀(고스톱_점수계산) 실제 기록 + 확정 규칙(독박 A안·첫뻑)
const assert = require('assert');
const { baseAmount, calcGame } = require('./calc.js');

const P = ['장모님', '이준규', '전진표'];
const g = (o) => calcGame(Object.assign({ players: P, winner: null, score: 0, bak: {}, dokbak: null, ppeok: null }, o)).amounts;

const cases = [
  // [설명, 실제값, 기대값]
  ['기본금 0~9점', [0,1,2,3,4,5,6,7,8,9].map(baseAmount), [0,0,0,1000,1000,2000,2000,3000,3000,4000]],
  // 250728 시트
  ['250728#1 이준규 3점', g({ winner: 1, score: 3 }), [-1000, 2000, -1000]],
  ['250728#2 전진표 6점', g({ winner: 2, score: 6 }), [-2000, -2000, 4000]],
  // 251008 시트
  ['251008#2 장모님 3점, 전진표 피박', g({ winner: 0, score: 3, bak: { 2: { pi: true } } }), [3000, -1000, -2000]],
  ['251008#3 이준규 5점, 둘 다 피박', g({ winner: 1, score: 5, bak: { 0: { pi: true }, 2: { pi: true } } }), [-4000, 8000, -4000]],
  ['251008#4 전진표 4점, 이준규 피박', g({ winner: 2, score: 4, bak: { 1: { pi: true } } }), [-1000, -2000, 3000]],
  // 250524 시트 (피박+광박 = 4배)
  ['250524#4 전진표 5점, 장모님 피박+광박', g({ winner: 2, score: 5, bak: { 0: { pi: true, gwang: true } } }), [-8000, -2000, 10000]],
  // 20260103 시트 (독박 = 기본금 2배를 혼자)
  ['20260103#5 이준규 4점, 전진표 독박', g({ winner: 1, score: 4, dokbak: 2 }), [0, 2000, -2000]],
  // 독박 A안: 다른 패자의 박 몫까지 독박자가 부담
  ['독박A 5점, 전진표 독박 + 장모님 피박', g({ winner: 1, score: 5, dokbak: 2, bak: { 0: { pi: true } } }), [0, 6000, -6000]],
  ['독박A 3점, 독박자 본인 피박', g({ winner: 0, score: 3, dokbak: 1, bak: { 1: { pi: true } } }), [3000, -3000, 0]],
  // 첫뻑
  ['첫뻑만 (나가리 판)', g({ ppeok: 0 }), [2000, -1000, -1000]],
  ['첫뻑 + 승리 다른 사람', g({ winner: 1, score: 3, ppeok: 2 }), [-2000, 1000, 1000]],
  // 나가리
  ['2점 = 나가리', g({ winner: 0, score: 2, bak: { 1: { pi: true } } }), [0, 0, 0]],
  // 승자 본인을 독박으로 지정해도 무시
  ['승자=독박 지정 무시', g({ winner: 0, score: 3, dokbak: 0 }), [2000, -1000, -1000]],
];

// 나가리 다음 판 2배 (연속이면 4배…), 첫뻑은 배수 없음
const { calcSession, nextMult } = require('./calc.js');
const G = (o) => Object.assign({ players: P, winner: null, score: 0, bak: {}, dokbak: null, ppeok: null }, o);
const seq = [
  G({}),                                            // 1 나가리
  G({ winner: 1, score: 3 }),                       // 2 ×2 → 판돈 2,000
  G({ winner: 0, score: 3 }),                       // 3 ×1 (초기화)
  G({ ppeok: 2 }),                                  // 4 나가리 + 첫뻑(배수 없음)
  G({ winner: 0, score: 2 }),                       // 5 3점 미만 = 나가리 (연속 2번째)
  G({ winner: 2, score: 5, bak: { 0: { pi: true } } }), // 6 ×4 → 판돈 8,000, 장모님 피박 16,000
  G({ winner: 1, score: 3, dokbak: 0 }),            // 7 ×1, 독박 2,000
];
const sr = calcSession(seq);
cases.push(['나가리 배수 순서', sr.map((r) => r.mult), [1, 2, 1, 1, 2, 4, 1]]);
cases.push(['나가리 후 3점 = 2,000원', sr[1].amounts, [-2000, 4000, -2000]]);
cases.push(['배수 초기화', sr[2].amounts, [2000, -1000, -1000]]);
cases.push(['나가리 판 첫뻑은 1,000 고정', sr[3].amounts, [-1000, -1000, 2000]]);
cases.push(['연속 나가리 ×4 + 피박', sr[5].amounts, [-16000, -8000, 24000]]);
cases.push(['다음 판 배수 (승리 후)', nextMult(seq), 1]);
cases.push(['다음 판 배수 (나가리 2연속 후)', nextMult([G({}), G({})]), 4]);
cases.push(['다음 판 배수 (기록 없음)', nextMult([]), 1]);

// 첫뻑 여러 명 (한 판에 각자 첫 턴 1회)
cases.push(['첫뻑 2명 + 장모님 3점', g({ winner: 0, score: 3, ppeok: [2, 1] }), [0, 0, 0]]);
cases.push(['첫뻑 3명 = 서로 상쇄', g({ ppeok: [0, 1, 2] }), [0, 0, 0]]);
cases.push(['첫뻑 같은 사람 중복 = 1회', g({ ppeok: [2, 2] }), [-1000, -1000, 2000]]);
cases.push(['첫뻑 1명 (배열)', calcGame({ players: P, winner: 1, score: 5, bak: {}, ppeok: [0] }).ppeokAmounts, [2000, -1000, -1000]]);

// 고·흔들기 → 최종 점수
const { finalScore } = require('./calc.js');
cases.push(['최종점수: 고 없음', finalScore(4, 0, 0), 4]);
cases.push(['최종점수: 1고 +1', finalScore(4, 1, 0), 5]);
cases.push(['최종점수: 2고 +2', finalScore(4, 2, 0), 6]);
cases.push(['최종점수: 3고 (4+3)×2', finalScore(4, 3, 0), 14]);
cases.push(['최종점수: 4고 (4+4)×4', finalScore(4, 4, 0), 32]);
cases.push(['최종점수: 5고 (3+5)×8', finalScore(3, 5, 0), 64]);
cases.push(['최종점수: 흔들기 1번 ×2', finalScore(5, 0, 1), 10]);
cases.push(['최종점수: 흔들기 2번 ×4', finalScore(3, 0, 2), 12]);
cases.push(['최종점수: 3고+흔들기 (4+3)×2×2', finalScore(4, 3, 1), 28]);
cases.push(['최종점수: 3점 미만은 고 불가', finalScore(2, 1, 1), 2]);
cases.push(['금액: 3점 1고 → 4점 → 1,000', g({ winner: 0, score: 3, go: 1 }), [2000, -1000, -1000]]);
cases.push(['금액: 4점 3고+흔들기 → 28점 → 13,000', g({ winner: 2, score: 4, go: 3, shake: 1 }), [-13000, -13000, 26000]]);
cases.push(['금액: 예전 기록(go 없음)은 score 그대로', g({ winner: 1, score: 6 }), [-2000, 4000, -2000]]);

// 승·패 횟수
const { winLoss } = require('./calc.js');
cases.push(['승패: 기록 없음', winLoss([], 3), [{ w: 0, l: 0 }, { w: 0, l: 0 }, { w: 0, l: 0 }]]);
cases.push(['승패: 승 2·나가리 1·독박 1', winLoss([
  G({ winner: 0, score: 3 }),
  G({}),                                   // 나가리 — 셈 안 함
  G({ winner: 0, score: 2 }),              // 3점 미만 나가리 — 셈 안 함
  G({ winner: 2, score: 5, dokbak: 1 }),   // 독박도 패
], 3), [{ w: 1, l: 1 }, { w: 0, l: 2 }, { w: 1, l: 1 }]]);

// 검수 A: 화면으로는 못 만드는 값이 저장돼 있어도 일관되게 처리
cases.push(['고 2.5 → 2고로', g({ winner: 1, score: 4, go: 2.5 }), [-2000, 4000, -2000]]);
cases.push(['고 "3"(글자) → 3고', finalScore(4, '3', 0), 14]);
cases.push(['승자 범위 밖(3) → 나가리', g({ winner: 3, score: 5 }), [0, 0, 0]]);
cases.push(['승자 -1 → 나가리', g({ winner: -1, score: 5 }), [0, 0, 0]]);
cases.push(['승자 "1"(글자) → 금액', g({ winner: '1', score: 3 }), [-1000, 2000, -1000]]);
cases.push(['승자 "0"(글자) → 승패도 같은 해석', winLoss([{ players: P, winner: '0', score: 3 }], 3), [{ w: 1, l: 0 }, { w: 0, l: 1 }, { w: 0, l: 1 }]]);
cases.push(['독박 "2"(글자) → 독박 적용', g({ winner: 1, score: 4, dokbak: '2' }), [0, 2000, -2000]]);
cases.push(['점수 "5"(글자)', g({ winner: 0, score: '5' }), [4000, -2000, -2000]]);
cases.push(['범위 밖 승자는 isNagari 와 일치', require('./calc.js').isNagari({ players: P, winner: 5, score: 5 }), true]);

// 승자는 항상 1명: 승패 금액(winAmounts)에서 플러스는 승자뿐 — 모든 조합 전수 검사
const full = (o) => calcGame(Object.assign({ players: P, winner: null, score: 0, bak: {}, dokbak: null, ppeok: null }, o));
let combos = 0, bad = 0;
for (let w = 0; w < 3; w++) for (let s = 3; s <= 12; s++) for (let pp = -1; pp < 3; pp++) for (let d = -1; d < 3; d++) for (let m = 0; m < 64; m++) {
  const bak = {}; [0, 1, 2].forEach((i) => { bak[i] = { pi: !!(m >> (i * 2) & 1), gwang: !!(m >> (i * 2 + 1) & 1) }; });
  const r = full({ winner: w, score: s, bak, dokbak: d < 0 ? null : d, ppeok: pp < 0 ? null : pp });
  combos++;
  const plus = r.winAmounts.map((a, i) => (a > 0 ? i : -1)).filter((i) => i >= 0);
  const sumOk = r.amounts.reduce((x, y) => x + y, 0) === 0;
  if (plus.length !== 1 || plus[0] !== w || !sumOk) bad++;
}
cases.push([`승자 1명 전수 검사 (${combos}조합)`, bad, 0]);

let pass = 0;
for (const [name, actual, expected] of cases) {
  try { assert.deepStrictEqual(actual, expected); pass++; console.log('PASS', name); }
  catch (e) { console.log('FAIL', name, '실제', JSON.stringify(actual), '기대', JSON.stringify(expected)); }
}
console.log(`\n${pass}/${cases.length} 통과`);
process.exit(pass === cases.length ? 0 : 1);

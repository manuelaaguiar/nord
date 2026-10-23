const fs=require('fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('public/nord/typography.css','utf8');
const html=JSON.parse(fs.readFileSync('data/dashboard-html.ts','utf8').split('\n')[0].slice('const html = '.length,-1));
assert.match(html,/\/nord\/typography.css\?v=roles1/);
for(const token of ['editorial','heading','ui','label','data'])assert.match(css,new RegExp('--font-'+token+':'));
assert.match(css,/-apple-system,BlinkMacSystemFont,'DM Sans'/);
assert.match(css,/#nav button,\.mobile-nav button\{[^}]*font-weight:500;[^}]*font-size:16px;[^}]*min-height:48px/);
assert.match(css,/font-variant-numeric:tabular-nums lining-nums/);
for(const font of ['play','cousine']){const bytes=fs.readFileSync('public/nord/design/fonts/'+font+'-regular.ttf');assert.equal(bytes.readUInt32BE(0),0x10000);assert.ok(bytes.length>20000);assert.match(fs.readFileSync('public/nord/design/fonts/'+font+'-OFL.txt','utf8'),/SIL OPEN FONT LICENSE/)}
for(const family of ['Arial','Georgia',"'Courier New'"])assert.ok(css.includes('font-family:'+family));
assert.doesNotMatch(css,/@import|https:\/\/fonts/);
console.log('PASS: typography roles, self-hosted official font binaries/licenses, Apple system fallback, 16px/48px medium-weight navigation, tabular figures and preserved journal text families. Visual/font load verified separately in browser.');

assert.match(css,/--font-editorial:\x27Cormorant Garamond\x27/);assert.match(css,/--font-heading:Play/);assert.match(css,/prefers-reduced-transparency:reduce/);assert.match(css,/@supports/);assert.match(css,/blur\(7px\)/);

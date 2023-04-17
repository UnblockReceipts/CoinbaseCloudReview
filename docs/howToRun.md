Quick start steps to run this code:
0. Copy .env.example to .env in the same location and replace the ellipses with your own values.
1. `cd source/frontend`
2. `yarn install`
3. `yarn start` (which will open a browser to localhost:3000)

Example URLs to test:
1. http://localhost:3000
1. http://localhost:3000/tx/0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2
1. http://localhost:3000/?tx=0x7c6906378701d6c89ba1cad7ad1f5ae04da38bc87e64560b329cbd0a389be1c9
1. http://localhost:3000/acct/silviamargarita.eth
1. https://localhost:3000/?0x58774Bb8acD458A640aF0B88238369A167546ef2=ENS+.com+registrar&0x7b90cbf130f78714c4350d2b98d716050c978b253f07be8322a3d8c034262431=Adding+unblockreceipts.com+to+the+ENS+registry.&acct=unblockreceipts.com&0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85=ENS+.eth+registrar&0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41=ENS+public+resolver&0x084b1c3c81545d370f3634392de611caabff8148=ENS+reverse+registrar
1. http://localhost:3000/tx/0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2,0x2fa6d5ff96474781b10c829a14edb6512004f63e875818808d8e7ffc95b33ae1
1. localhost:3000/tx/0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2,%200x2fa6d5ff96474781b10c829a14edb6512004f63e875818808d8e7ffc95b33ae1
1. http://localhost:3000/?0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2=ENS%20Domains%20purchase%20of%20example.eth&0x2fa6d5ff96474781b10c829a14edb6512004f63e875818808d8e7ffc95b33ae1=Registration%20for%20build%20event%20at%20DEVCON&0x7c6906378701d6c89ba1cad7ad1f5ae04da38bc87e64560b329cbd0a389be1c9=%22Can%27t%20beat%20this%20amount%20of%20fun%20with%20receipts,%22%20she%20said.
1. http://localhost:3000/acct/0xBc3Eb8299C8647374E69E63a6A2E30398348B91d
1. http://localhost:3000/acct/0x3cd751e6b0078be393132286c442345e5dc49699 (has millions of transactions; will be super slow)
1. http://localhost:3000/?acct=ricmoo.eth (will also be slow)
To create a production bundle, use `npm run build` or `yarn build`.

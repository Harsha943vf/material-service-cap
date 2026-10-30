export default function (test) {
    const { GET, POST, expect } = test;

    const base = '/odata/v4/material';
    const setQty = id => `${base}/Materials(${id})/MaterialService.setMaterialQuantity`;

    async function expectFail(promise, statuses) {
        try {
            await promise;
            throw new Error('Expected request to fail');
        } catch (error) {
            if (!error.response) throw error;
            expect(statuses).to.include(error.response.status);
        }
    }

    describe('MaterialService (bound setMaterialQuantity)', () => {

        beforeEach(test.data.reset);

        it('sets quantity on a material', async () => {
            const res = await POST(setQty(1001), { quantity: 50 });
            expect(res.status).to.equal(200);

            const { data } = await GET(`${base}/Materials(1001)`);
            expect(data.quantity).to.equal(50);
        });

        it('rejects a negative quantity', async () => {
            await expectFail(POST(setQty(1001), { quantity: -5 }), [400]);
        });

        it('rejects an unknown material', async () => {
            await expectFail(POST(setQty(99999), { quantity: 50 }), [404]);
        });
    });
}
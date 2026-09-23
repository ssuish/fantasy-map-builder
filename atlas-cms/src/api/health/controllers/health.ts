export default {
  check(ctx: { status: number; body: unknown }) {
    ctx.status = 200;
    ctx.body = { status: 'ok' };
  },
};

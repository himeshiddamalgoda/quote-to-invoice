import type { RequestHandler } from 'express';
import type { z } from 'zod';
export function validate(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) return next(result.error);
    res.locals.input = result.data;
    next();
  };
}

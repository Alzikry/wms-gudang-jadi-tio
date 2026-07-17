// Error handler terpusat — semua controller tinggal next(err)
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      message: 'Input tidak valid',
      errors: err.errors,
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Terjadi kesalahan pada server';

  res.status(status).json({ message });
}

module.exports = errorHandler;

export default function (req, res, next) {
  req.ctx = {
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
    headers: req.headers
  };
  next();
}

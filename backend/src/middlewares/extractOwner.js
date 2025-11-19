const Owner = require("../models/Owner");

module.exports = async (req, res, next) => {
  try {
    const host = req.headers.host || "";
    const parts = host.split(".");

    // No subdomain, or platform domains → skip tenant mode
    const subdomain = parts.length > 2 ? parts[0] : null;

    if (!subdomain || subdomain === "www" || subdomain === "api" || subdomain === "platform") {
      req.ownerId = null;
      req.tenant = null;
      return next();
    }

    // Lookup tenant
    const owner = await Owner.findOne({ subdomain });

    if (!owner) {
      return res.status(400).json({ message: "Invalid tenant" });
    }

    req.ownerId = owner._id.toString();
    req.tenant = owner;

    return next();
  } catch (err) {
    console.error("ExtractOwner Error:", err);
    return res.status(500).json({ message: "Tenant detection failed" });
  }
};

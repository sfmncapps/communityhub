import express from "express";
import {
  getPublicVendors,
  createVendorListing,
  uploadVendorImage,
} from "../controllers/vendorController.js";
import { optionalUser } from "../middleware/requireUser.js";

const router = express.Router();

// Public Vendors & Community Shops
router.get("/", getPublicVendors);

// Submit new local vendor / shop (requires admin approval)
router.post("/", optionalUser, createVendorListing);

// Storefront image upload
router.post("/upload-image", uploadVendorImage);

export default router;

import { useState } from "react";
import { supabase } from "../supabaseClient"; // keep as your working path

const categories = {
  "Food & Beverage": [
    "Restaurants",
    "Cafes & Coffee Shops",
    "Food Trucks",
    "Bakeries",
    "Catering Services",
    "Bars & Pubs",
    "BBQ & Smokehouses"
  ],
  "Real Estate & Property": [
    "Real Estate Agents",
    "Property Developers",
    "Property Management",
    "Rental Services"
  ],
  "IT, Tech & Digital Services": [
    "Web Design & Development",
    "Digital Marketing",
    "Software Companies",
    "SEO Services"
  ]
};

const MyDirectory = () => {
  const [form, setForm] = useState({
    business_name: "",
    category: "",
    sub_category: "",
    year_established: "",
    business_type: "",
    owner_name: "",
    mobile: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "Texas",
    zip: "",
    description: "",
    services: "",
    price_range: "",
    working_days: [],
    open_time: "",
    close_time: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    experience: ""
  });

  // ✅ NEW: image + uploading state (must be inside component)
  const [businessImage, setBusinessImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day]
    }));
  };

  // ✅ UPDATED submitForm: upload image to Storage + store URL in directory_listings
  const submitForm = async () => {
    try {
      setUploading(true);

      const { data: userData } = await supabase.auth.getUser();

if (!userData?.user) {
  alert("Please login to submit business listing & upload image.");
  setUploading(false);
  return;
}

const userId = userData.user.id;


      // Image required
      if (!businessImage) {
        alert("Please upload a business image (JPG/PNG/WEBP). Recommended: 1570×1048.");
        setUploading(false);
        return;
      }

      // Upload to storage bucket
      const fileExt = businessImage.name.split(".").pop();
      const fileName = `business_${Date.now()}.${fileExt}`;
      const filePath = `${userId || "guest"}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("directory-images")
        .upload(filePath, businessImage, {
          cacheControl: "3600",
          upsert: false,
          contentType: businessImage.type
        });

      if (uploadError) {
        alert("Upload Error: " + uploadError.message);
        setUploading(false);
        return;
      }

      // Get public URL (bucket must be public)
      const { data: publicData } = supabase.storage
        .from("directory-images")
        .getPublicUrl(filePath);

      const business_image_url = publicData?.publicUrl || null;

      // Insert to table with image url
      const { error } = await supabase.from("directory_listings").insert({
        user_id: userId,
        ...form,
        business_image_url,
        status: "pending"
      });

      if (error) {
        alert("Error: " + error.message);
      } else {
        alert("Business submitted for admin approval!");
        setBusinessImage(null);
      }
    } catch (err) {
      alert("Error: " + (err?.message || "Something went wrong"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="directory-container">
      <h2>Texas Business Directory</h2>
      <p className="subtitle">Register your business professionally</p>

      {/* BASIC INFO */}
      <div className="card">
        <h3>Basic Business Information</h3>
        <input name="business_name" placeholder="Business Name" onChange={handleChange} />

        {/* ✅ NEW: Business Image Upload */}
        <div className="image-upload">
          <label className="img-label">Business Image (Recommended: 1570 × 1048)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const allowed = ["image/png", "image/jpeg", "image/webp"];
              if (!allowed.includes(file.type)) {
                alert("Only JPG / PNG / WEBP allowed");
                e.target.value = "";
                return;
              }

              // Optional file size limit (3MB)
              if (file.size > 3 * 1024 * 1024) {
                alert("Image should be under 3MB");
                e.target.value = "";
                return;
              }

              setBusinessImage(file);
            }}
          />
          <small className="img-hint">
            Allowed: JPG/PNG/WEBP • Recommended: 1570×1048 px • Max: 3MB
          </small>
        </div>

        <select name="category" onChange={handleChange}>
          <option value="">Select Category</option>
          {Object.keys(categories).map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>

        <select name="sub_category" onChange={handleChange}>
          <option value="">Select Sub-Category</option>
          {categories[form.category]?.map((sub) => (
            <option key={sub}>{sub}</option>
          ))}
        </select>

        <input name="year_established" placeholder="Year of Establishment" onChange={handleChange} />

        <select name="business_type" onChange={handleChange}>
          <option value="">Business Type</option>
          <option>LLC</option>
          <option>Sole Proprietorship</option>
          <option>Partnership</option>
          <option>Corporation</option>
        </select>
      </div>

      {/* CONTACT */}
      <div className="card">
        <h3>Contact Details</h3>
        <input name="owner_name" placeholder="Owner Name" onChange={handleChange} />
        <input name="mobile" placeholder="Mobile Number" onChange={handleChange} />
        <input name="email" placeholder="Email Address" onChange={handleChange} />
        <input name="website" placeholder="Website URL" onChange={handleChange} />
      </div>

      {/* LOCATION */}
      <div className="card">
        <h3>Location</h3>
        <textarea name="address" placeholder="Street Address" onChange={handleChange} />
        <input name="city" placeholder="City" onChange={handleChange} />
        <input value="Texas" disabled />
        <input name="zip" placeholder="ZIP Code" onChange={handleChange} />
      </div>

      {/* DESCRIPTION */}
      <div className="card">
        <h3>Business Description</h3>
        <textarea
          rows="5"
          name="description"
          placeholder="Describe your services, experience & USP"
          onChange={handleChange}
        />
      </div>

      {/* SERVICES */}
      <div className="card">
        <h3>Services & Pricing</h3>
        <input name="services" placeholder="Main Services" onChange={handleChange} />

        <select name="price_range" onChange={handleChange}>
          <option value="">Price Range</option>
          <option>$</option>
          <option>$$</option>
          <option>$$$</option>
        </select>
      </div>

      {/* TIMINGS */}
      <div className="card">
        <h3>Business Timings</h3>
        <div className="days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <label key={day}>
              <input type="checkbox" onChange={() => toggleDay(day)} /> {day}
            </label>
          ))}
        </div>
        <input type="time" name="open_time" onChange={handleChange} />
        <input type="time" name="close_time" onChange={handleChange} />
      </div>

      {/* SOCIAL */}
      <div className="card">
        <h3>Social Media</h3>
        <input name="facebook" placeholder="Facebook URL" onChange={handleChange} />
        <input name="instagram" placeholder="Instagram URL" onChange={handleChange} />
        <input name="linkedin" placeholder="LinkedIn URL" onChange={handleChange} />
      </div>

      <button className="submit-btn" onClick={submitForm} disabled={uploading}>
        {uploading ? "Uploading..." : "Submit Business Listing"}
      </button>

      {/* CSS */}
      <style>{`
        .directory-container {
          max-width: 900px;
          padding: 20px;
        }

        h2 {
          font-size: 28px;
        }

        .subtitle {
          color: #555;
          margin-bottom: 25px;
        }

        .card {
          background: #fff;
          padding: 25px;
          margin-bottom: 25px;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
        }

        .card h3 {
          margin-bottom: 15px;
          font-size: 18px;
          color: #1f2937;
        }

        input, textarea, select {
          width: 100%;
          padding: 12px;
          margin-bottom: 14px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 14px;
        }

        textarea {
          resize: none;
        }

        .days {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 15px;
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .submit-btn:hover {
          background: #1d4ed8;
        }

        .submit-btn:disabled{
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* ✅ NEW styles for image upload */
        .image-upload {
          margin-top: 10px;
          margin-bottom: 10px;
          text-align: left;
        }

        .img-label {
          display: block;
          font-weight: 700;
          margin-bottom: 8px;
          color: #1f2937;
        }

        .img-hint {
          display: block;
          margin-top: -6px;
          margin-bottom: 10px;
          color: #6b7280;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default MyDirectory;

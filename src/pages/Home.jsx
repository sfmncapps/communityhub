import { useEffect, useState } from "react";
import supabase from "../config/supabaseClient";


export default function Home() {

  const [homeJobs, setHomeJobs] = useState([]);
const [homeDirectory, setHomeDirectory] = useState([]);
const [homeClassifieds, setHomeClassifieds] = useState([]); // ✅ add this


useEffect(() => {
  const fetchHomeJobs = async () => {
    const { data } = await supabase
      .from("jobs")
      .select("id, job_title, job_description, job_type, location, apply_link, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(4);

    setHomeJobs(data || []);
  };

  fetchHomeJobs();
}, []);

useEffect(() => {
  const fetchHomeDirectory = async () => {
    const { data } = await supabase
      .from("directory_listings")
      .select("id, business_name, category, city, state, mobile, website, business_image_url, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(4);

    setHomeDirectory(data || []);
  };

  fetchHomeDirectory();
}, []);

useEffect(() => {
  const fetchHomeClassifieds = async () => {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("classifieds")
      .select("id, title, description, category, sub_category, city, zip_code, region, state, price, media_type, media_url, youtube_url, created_at, expires_at")
      .eq("status", "approved")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) return;
    setHomeClassifieds(data || []);
  };

  fetchHomeClassifieds();
}, []);

const toEmbedUrl = (url = "") => {
  try {
    const u = new URL(url);
    const vid = u.searchParams.get("v");
    if (vid) return `https://www.youtube.com/embed/${vid}`;
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    return url;
  } catch {
    return url;
  }
};



  return (
    <div className="home">

      {/* INTERNAL CSS */}
      <style>{`
        .home {
          font-family: "Segoe UI", sans-serif;
          color: #222;
        }

        /* HERO */
        .hero {
          background: linear-gradient(135deg, #0f766e, #16a34a);
          color: #fff;
          padding: 90px 0px 50px 70px;
          text-align: left;
        }

        .hero h1 {
        font-size: 40px;
        margin-bottom: 15px;
        padding-right: 20px;

        opacity: 0;
        transform: translateY(30px);
        animation: slideUp 0.8s ease-out forwards;
      }

      @keyframes slideUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }


        .hero h3 {
          width:195px;
          font-size: 20px;
          margin-bottom: 15px;
          padding: 0px 0px 0px 20px;
          border-radius: 5px;
          background-color:rgb(255, 107, 107);
          opacity: 0;
        transform: translateY(30px);
        animation: slideUp 0.8s ease-out forwards;
      }

      @keyframes slideUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
  
        }

        .hero p {
          max-width: 700px;
          font-size: 18px;
          line-height: 1.6;
          text-align:left;
        }

        .hero-links {
          margin-top: 30px;
          padding:0px 20px 0px 0px;
          opacity: 0;
        transform: translateY(30px);
        animation: slideUp 0.8s ease-out forwards;
      }

      @keyframes slideUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
        }

        .hero-links a {
          margin: 0px 8px 8px 0px;
          padding: 10px 20px 10px 20px;
          background: #fff;
          color: #0f766e;
          border-radius: 5px;
          text-decoration: none;
          font-weight: 600;
          display: inline-block;
        }

        /* ABOUT */
        .about {
          display: flex;
          gap: 30px;
          padding: 70px 60px 70px 60px;
          align-items: center;
        }

        .about img {
          max-width: 550px;
          width: 100%;
          border-radius: 5px;
          
        }

        .about-content h2 {
          font-size: 25px;
          color:#FF6B70;
          margin-bottom: 15px;
        }

        .about-content p {
          line-height: 1.7;
          margin-bottom: 12px;
          color: #000000ff;
          text-align: justify;
          }

        /* Feature SECTION */
.features {
  background: #f8fafc;
  padding: 30px 50px;
  text-align: center;
}

.section-title {
  text-align:left;
  font-size: 25px;
  margin-bottom: 30px;
  font-weight: 700;
  color: #0f172a;
}

/* GRID */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 35px;
}

/* CARD */
.feature-card {
  position: relative;
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.1s ease, box-shadow 0.1s ease;  /* ✅ fast */
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}


/* Simple Border (No Animation) */
.feature-card::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 22px;
  background: #16a34a;   /* ✅ single solid color */
  z-index: -1;
  animation: none;       /* ✅ remove animation */
}


@keyframes borderRotate {
  0% { background-position: 0% 50%; }
  100% { background-position: 400% 50%; }
}

/* Hover Effect */
.feature-card:hover {
  transform: translateY(-12px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

/* IMAGE */
.feature-img img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

/* CONTENT */
.feature-content {
  padding: 25px;
  text-align: left;
}

.feature-content h3 {
  font-size: 22px;
  margin-bottom: 12px;
  color: #0f172a;
}

/* Text white on hover */
.feature-card:hover .feature-content h3,
.feature-card:hover .feature-content p {
  color: #ffffff;
}
.feature-content p {
  font-size: 15px;
  text-align: justify;
  line-height: 1.6;
  color: #475569;
  margin-bottom: 20px;
}

/* BUTTON */
.feature-btn {
  padding: 10px 18px;
  border: none;
  background: #FF6B70;
  color: white;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.3s ease;
}

.feature-btn:hover {
  background: linear-gradient(45deg, #06b6d4, #6366f1);
  transform: scale(1.05);
  color:white;
}

//* HOME JOBS SECTION (scoped - no impact on other sections) */
.homejobs-section{
  background: #f8fafc;
  padding: 30px 50px;
}

.homejobs-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:16px;
  margin-bottom:10px;
  margin-top:30px;
  padding: 20px 45px 20px 45px;
  text-align:left;
}

.homejobs-head h2{
  margin:0 0 6px 0;
  font-size:25px;
  font-weight:700;
  color:#0f172a;
}

.homejobs-head p{
  margin:0;
  color:#475569;
  font-size:14px;
  max-width:560px;
}

.homejobs-more-btn{
  background:#FF6B70;
  color:#fff;
  padding:10px 14px;
  border-radius:10px;
  text-decoration:none;
  font-weight:600;
  transition:0.3s ease;
  white-space:nowrap;
}
.homejobs-more-btn:hover{
  background:#0f766e;
  transform: translateY(-2px);
  color:white;
}

/* GRID like jobs page, but compact for home */
.homejobs-grid{
  display:grid;
  grid-template-columns: repeat(4, 1fr);
  gap:24px;
  padding:20px 45px 20px 45px;
}

/* CARD */
.homejobs-card{
  background: linear-gradient(145deg, #ffffff, #f4f7ff);
  border-top: 3px solid rgb(255, 107, 107);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}
.homejobs-card:hover{
  transform: scale(1.04) translateY(-4px);
  box-shadow: 0 22px 45px rgba(37,99,235,0.18);
  z-index: 2;
}

/* ANIMATE (same feel) */
.homejobs-animate{
  opacity:0;
  transform: translateY(30px);
  animation: homejobsFadeUp 0.7s ease forwards;
}
@keyframes homejobsFadeUp{
  to{ opacity:1; transform: translateY(0); }
}

/* TITLE */
.homejobs-title{
  display:flex;
  gap:12px;
  align-items:baseline;
  padding-top: 6px;
}
.homejobs-title i{
  width:22px;
  font-size:1.3rem;
  color:#2563eb;
}
.homejobs-title h4{
  margin:4px 0 0;
  font-size:1.05rem;
  color:#000;
}

/* FIELDS */
.homejobs-field{
  display:flex;
  gap:10px;
  align-items:baseline;
}
.homejobs-field i{
  font-size:1rem;
  color:#2563eb;
  margin-top:3px;
}
.homejobs-label{
  font-size:0.7rem;
  text-transform:uppercase;
  font-weight:700;
  color:#6b7280;
}
.homejobs-field p{
  margin:4px 0 0;
  color:#1f2937;
  font-size:0.92rem;
}

/* Limit description height so home page stays clean */
.homejobs-desc{
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* APPLY BUTTON */
.homejobs-apply-btn{
  margin-top:auto;
  text-decoration:none;
  background: rgb(255, 107, 107);
  color:white;
  padding:10px 16px;
  border-radius:10px;
  font-weight:600;
  display:inline-flex;
  align-items:center;
  gap:8px;
  justify-content:center;
  transition: all 0.3s ease;
}
.homejobs-apply-btn:hover{
  background:linear-gradient(135deg, #0f766e, #16a34a);
  transform: scale(1.03);
  color:white;
}

/* responsive */
@media (max-width: 1024px){
  .homejobs-grid{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px){
  .homejobs-section{ padding: 25px 18px; }
  .homejobs-grid{ grid-template-columns: 1fr; }
  .homejobs-head{ flex-direction:column; align-items:flex-start; }
}

/* responsive */
@media (max-width: 1024px){
  .home-jobs-row{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px){
  .home-latest-jobs{ padding: 25px 18px; }
  .home-jobs-row{ grid-template-columns: 1fr; }
  .home-latest-jobs-head{ align-items:flex-start; flex-direction:column; }
}


/* ✅ HOME DIRECTORY SECTION (scoped - no impact on other sections) */
.homedir-section{
  background:#f8fafc;
  padding:30px 50px;
}

.homedir-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:16px;
  margin-bottom:10px;
  margin-top:20px;
  padding: 20px 5px 20px 5px;
  text-align:left;
}

.homedir-head h2{
  margin:0 0 6px 0;
  font-size:25px;
  font-weight:700;
  color:#0f172a;
}

.homedir-head p{
  margin:0;
  color:#475569;
  font-size:14px;
  max-width:560px;
}

.homedir-more-btn{
  background:#FF6B70;
  color:#fff;
  padding:10px 14px;
  border-radius:10px;
  text-decoration:none;
  font-weight:600;
  transition:0.3s ease;
  white-space:nowrap;
}
.homedir-more-btn:hover{
  background:#0f766e;
  transform: translateY(-2px);
  color:white;
}

/* GRID */
.homedir-grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:24px;
}

/* CARD */
.homedir-card{
  background:#fff;
  border-radius:16px;
  padding:15px;
  border:1px solid #eef2f7;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  display:flex;
  flex-direction:column;
  transition: transform 0.35s ease, box-shadow 0.35s ease;
}
.homedir-card:hover{
  transform: scale(1.03) translateY(-4px);
  box-shadow: 0 22px 45px rgba(15,118,110,0.18);
}

/* ANIMATE */
.homedir-animate{
  opacity:0;
  transform: translateY(30px);
  animation: homedirFadeUp 0.7s ease forwards;
}
@keyframes homedirFadeUp{
  to{ opacity:1; transform: translateY(0); }
}

/* IMAGE */
.homedir-imgWrap{
  width:100%;
  height:180px;
  border-radius:12px;
  overflow:hidden;
  background:#f9fafb;
  margin-bottom:12px;
}
.homedir-img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

/* TOP */
.homedir-top{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  margin-bottom:10px;
}
.homedir-title{
  margin:0;
  font-size:16px;
  font-weight:800;
  color:#111827;
  line-height:1.2;
}

/* CATEGORY BADGE */
.homedir-badge{
  font-size:11px;
  background:#e0f2fe;
  color:#0284c7;
  padding:4px 10px;
  border-radius:20px;
  white-space:nowrap;
}

/* INFO */
.homedir-info p{
  margin:4px 0;
  font-size:13px;
  color:#333;
}

/* BUTTON */
.homedir-visit-btn{
  margin-top:auto;
  background: linear-gradient(135deg, #ff6b6b, #ff4b4b);
  color:#fff;
  text-align:center;
  padding:10px;
  border-radius:10px;
  text-decoration:none;
  font-size:13px;
  font-weight:700;
  transition:0.3s ease;
}
.homedir-visit-btn:hover{
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0,0,0,0.15);
  background:linear-gradient(135deg, #0f766e, #16a34a);
  color:white;
}

/* Responsive */
@media (max-width: 1024px){
  .homedir-grid{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px){
  .homedir-section{ padding: 25px 18px; }
  .homedir-grid{ grid-template-columns: 1fr; padding:20px 18px; }
  .homedir-head{ flex-direction:column; align-items:flex-start; padding:20px 18px; }
}


/* ✅ HOME CLASSIFIEDS SECTION (scoped - no impact on other sections) */
.homecls-section{
  background:#f8fafc;
  padding:30px 50px;
}

.homecls-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:16px;
  margin-bottom:10px;
  margin-top:20px;
  padding: 20px 5px;
  text-align:left;
}

.homecls-head h2{
  margin:0 0 6px 0;
  font-size:25px;
  font-weight:700;
  color:#0f172a;
}

.homecls-head p{
  margin:0;
  color:#475569;
  font-size:14px;
  max-width:560px;
}

.homecls-more-btn{
  background:#FF6B70;
  color:#fff;
  padding:10px 14px;
  border-radius:10px;
  text-decoration:none;
  font-weight:600;
  transition:0.3s ease;
  white-space:nowrap;
}
.homecls-more-btn:hover{
  background:#0f766e;
  transform: translateY(-2px);
  color:white;
}

/* GRID */
.homecls-grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:24px;
  padding:20px 5px;
}

/* CARD */
.homecls-card{
  background:#fff;
  border-radius:16px;
  border:1px solid #eef2f7;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  overflow:hidden;
  transition: transform 0.35s ease, box-shadow 0.35s ease;
  display:flex;
  flex-direction:column;
}
.homecls-card:hover{
  transform: scale(1.03) translateY(-4px);
  box-shadow: 0 22px 45px rgba(37,99,235,0.18);
}

/* ANIMATE */
.homecls-animate{
  opacity:0;
  transform: translateY(30px);
  animation: homeclsFadeUp 0.7s ease forwards;
}
@keyframes homeclsFadeUp{
  to{ opacity:1; transform: translateY(0); }
}

/* MEDIA */
.homecls-media{
  position:relative;
  width:100%;
  height:180px;
  background:#111827;
}
.homecls-media img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.homecls-media iframe{
  width:100%;
  height:100%;
  border:0;
  display:block;
}

.homecls-noMedia{
  width:100%;
  height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  color:#e5e7eb;
  background: linear-gradient(135deg,#111827,#374151);
}
.homecls-noMediaTitle{ font-weight:900; }
.homecls-noMediaSub{ opacity:0.85; font-size:12px; margin-top:6px; }

.homecls-badges{
  position:absolute;
  left:12px;
  bottom:12px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.homecls-badge{
  font-size:11px;
  padding:6px 10px;
  border-radius:999px;
  background: rgba(255,255,255,0.92);
  color:#111827;
  font-weight:900;
}
.homecls-badge.ghost{
  background: rgba(17,24,39,0.78);
  color:#fff;
}

/* BODY */
.homecls-body{
  padding:14px;
  display:flex;
  flex-direction:column;
  gap:10px;
}

.homecls-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:10px;
}
.homecls-title{
  margin:0;
  font-size:16px;
  font-weight:900;
  color:#111827;
  line-height:1.2;
}
.homecls-price{
  font-weight:900;
  color:#111827;
  white-space:nowrap;
}

.homecls-meta{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  color:#475569;
  font-size:12px;
}

.homecls-desc{
  margin:0;
  color:#374151;
  font-size:13px;
  line-height:1.55;
  text-align:justify;
  display:-webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow:hidden;
}

.homecls-actions{
  margin-top:auto;
  display:flex;
  justify-content:space-between;
  gap:10px;
  flex-wrap:wrap;
}

.homecls-btn{
  background:#FF6B70;
  color:#fff;
  padding:10px 12px;
  border-radius:10px;
  text-decoration:none;
  font-weight:800;
  font-size:12px;
  transition:0.3s ease;
  white-space:nowrap;
}
.homecls-btn:hover{
  background:#0f766e;
  transform: translateY(-2px);
  color:#fff;
}

.homecls-btn.ghost{
  background:#ff4b4b;
}
.homecls-btn.ghost:hover{
  background:linear-gradient(135deg, #0f766e, #16a34a);
  color:white;
}

.homecls-empty{
  grid-column: 1 / -1;
  text-align:center;
  color:#6b7280;
  padding: 18px 10px;
}

/* Responsive */
@media (max-width: 1024px){
  .homecls-grid{ grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px){
  .homecls-section{ padding: 25px 18px; }
  .homecls-grid{ grid-template-columns: 1fr; padding:20px 18px; }
  .homecls-head{ flex-direction:column; align-items:flex-start; padding:20px 18px; }
}


        /* CONTACT SECTION */
.contact {
  padding: 50px 50px 50px 50px;
  background: linear-gradient(135deg, #f0fdfa, #ecfeff);
  display: flex;
  justify-content: center;
  align-items: center;
}

/* CENTER WRAPPER */
.contact-wrapper {
  width: 100%;
  max-width: 1000px;
}

/* CARD */
.contact-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  padding: 60px;
  border-radius: 30px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.08);
  text-align: center;
  animation: fadeUp 0.8s ease;
}

.contact-card h2 {
  font-size: 2.3rem;
  margin-bottom: 10px;
  color: #0f172a;
}

.contact-card p {
  margin-bottom: 40px;
  color: #555;
  font-size: 15px;
}

/* FORM */
.contact-form {
  width: 100%;
}

/* TWO COLUMN ROW */
.input-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.input-row input {
  flex: 1;
}

/* INPUTS */
.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  font-size: 15px;
  transition: all 0.3s ease;
  outline: none;
  background: #fff;
}

.contact-form input:focus,
.contact-form textarea:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15,118,110,0.15);
  transform: translateY(-2px);
}

/* BUTTON */
.contact-form button {
  margin-top: 20px;
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e, #16a34a);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.contact-form button:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 40px rgba(15,118,110,0.3);
}

.contact-form button:active {
  transform: scale(0.98);
}

/* ANIMATION */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* MOBILE */
@media (max-width: 768px) {

  .contact-card {
    padding: 40px 25px;
  }

  .input-row {
    flex-direction: column;
  }

}

/* ========================= */
/* GLOBAL RESPONSIVE FIXES  */
/* ========================= */

@media (max-width: 1200px) {
  .hero {
    padding: 70px 40px;
  }

  .about {
    padding: 50px 40px;
  }
}

/* ========================= */
/* TABLET VIEW (1024px ↓)   */
/* ========================= */

@media (max-width: 1024px) {

  /* HERO */
  .hero h1 {
    font-size: 32px;
  }

  .hero p {
    font-size: 16px;
  }

  /* ABOUT SECTION STACK */
  .about {
    flex-direction: column;
    text-align: center;
  }

  .about img {
    max-width: 100%;
  }

  .about-content {
    text-align: center;
  }

  /* FEATURES */
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* JOBS */
  .homejobs-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* DIRECTORY */
  .homedir-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* CLASSIFIEDS */
  .homecls-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ========================= */
/* MOBILE VIEW (768px ↓)    */
/* ========================= */

@media (max-width: 768px) {

  /* HERO */
  .hero {
    padding: 60px 20px;
    text-align: center;
  }

  .hero h3 {
    margin: 0 auto 15px;
  }

  .hero h1 {
    font-size: 26px;
  }

  .hero p {
    font-size: 15px;
  }

  .hero-links {
    text-align: center;
  }

  /* ABOUT */
  .about {
    padding: 40px 20px;
  }

  /* FEATURES */
  .features {
    padding: 40px 20px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  /* SECTION HEADERS */
  .homejobs-head,
  .homedir-head,
  .homecls-head {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }

  /* GRIDS */
  .homejobs-grid,
  .homedir-grid,
  .homecls-grid {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  /* CONTACT */
  .contact {
    padding: 40px 20px;
  }

  .contact-card {
    padding: 35px 20px;
  }
}

/* ========================= */
/* SMALL PHONES (480px ↓)   */
/* ========================= */

@media (max-width: 480px) {

  .hero h1 {
    font-size: 22px;
  }

  .hero h3 {
    font-size: 16px;
    width: auto;
    padding: 8px 15px;
  }

  .section-title {
    font-size: 20px;
  }

  .homejobs-head h2,
  .homedir-head h2,
  .homecls-head h2 {
    font-size: 20px;
  }

  .contact-card h2 {
    font-size: 1.6rem;
  }
}




      
        }
      `}
      </style>

      {/* HERO */}
      <section className="hero">
        <h3>Community Hub</h3>
        <h1>Your Gateway to Trusted Businesses, Jobs & Community Resources</h1>
        <p>
          A secure community platform with self-registration, admin approval,
          directories, jobs, and classifieds — designed for speed and simplicity.
        </p>

        <div className="hero-links">
          <a href="/directory">Directory</a>
          <a href="/jobs">Jobs</a>
          <a href="/classifieds">Classifieds</a>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about">
        <img
          src="/Community about us.png"
          alt="Community"
        />

        <div className="about-content">
          <h2 class="sam1">Welcome Community Hub</h2>
          <p>
            This platform is designed to empower verified users by offering a secure and structured
            self-registration process, followed by admin approval. This two-step verification ensures
            that only genuine and trusted members become part of the community, creating a safe and
            reliable environment for everyone.Once approved, users gain access to a fast-loading and
            user-friendly homepage that serves as a central hub for opportunities, resources, and
            connections. The prominently displayed links directory enables users to quickly discover
            businesses, services, jobs, classifieds, and community updates without confusion or delays.
          </p>
          <p>
            With a strong focus on speed, security, and ease of use, the platform helps users save time,
             build meaningful connections, and confidently explore opportunities—all within a trusted
            digital ecosystem.
          </p>
          
        </div>
      </section>

    
      {/* FEATURES */}
      
<section className="features">
  <h2 className="section-title">Platform Features</h2>

  <div className="feature-grid">

    <div className="feature-card">
      <div className="feature-img">
        <img src="Community hub.png" alt="Community" />
      </div>
      <div className="feature-content">
        <h3>Community</h3>
        <p>
          Connect with trusted members and grow strong relationships inside a safe, private community space.
        </p>
        <button className="feature-btn">View Community</button>
      </div>
    </div>

    <div className="feature-card">
      <div className="feature-img">
        <img src="directory.png" alt="Directory" />
      </div>
      <div className="feature-content">
        <h3>Directory</h3>
        <p>
          Browse verified listings quickly and reach members or businesses easily with smooth, simple navigation.
        </p>
        <button className="feature-btn">View Directory</button>
      </div>
    </div>

    <div className="feature-card">
      <div className="feature-img">
        <img src="jobs.png" alt="Jobs" />
      </div>
      <div className="feature-content">
        <h3>Jobs</h3>
        <p>
          Explore approved job posts shared by members and access opportunities available only to verified users.
        </p>
        <button className="feature-btn">View More Jobs</button>
      </div>
    </div>

    <div className="feature-card">
      <div className="feature-img">
        <img src="classifieds.png" alt="Classifieds" />
      </div>
      <div className="feature-content">
        <h3>Classifieds</h3>
        <p>
          Post, buy, sell, or promote services fast with clean listings and quick responses inside the platform.
        </p>
        <button className="feature-btn">View Classifieds</button>
      </div>
    </div>

  </div>
</section>


{/* HOME LATEST JOBS */}
<section className="homejobs-section">
  <div className="homejobs-head">
    <div>
      <h2>See Latest Jobs</h2>
      <p>Verified openings — updated automatically from jobs page.</p>
    </div>

    <a href="/jobs" className="homejobs-more-btn">View More Jobs</a>
  </div>

  <div className="homejobs-grid">
    {homeJobs.map((job, index) => (
      <div
        key={job.id}
        className="homejobs-card homejobs-animate"
        style={{ animationDelay: `${index * 0.08}s` }}
      >
        {/* Job Title */}
        <div className="homejobs-title">
          <i className="fa-solid fa-briefcase"></i>
          <div>
            <span className="homejobs-label">Job Title</span>
            <h4>{job.job_title}</h4>
          </div>
        </div>

        {/* Description */}
        <div className="homejobs-field">
          <i className="fa-solid fa-file-lines"></i>
          <div>
            <span className="homejobs-label">Description</span>
            <p className="homejobs-desc">{job.job_description}</p>
          </div>
        </div>

        {/* Job Type */}
        <div className="homejobs-field">
          <i className="fa-solid fa-clock"></i>
          <div>
            <span className="homejobs-label">Job Type</span>
            <p>{job.job_type}</p>
          </div>
        </div>

        {/* Location */}
        <div className="homejobs-field">
          <i className="fa-solid fa-location-dot"></i>
          <div>
            <span className="homejobs-label">Location</span>
            <p>{job.location}</p>
          </div>
        </div>

        {/* Apply */}
        {job.apply_link ? (
          <a
            href={job.apply_link}
            target="_blank"
            rel="noopener noreferrer"
            className="homejobs-apply-btn"
          >
            <i className="fa-solid fa-paper-plane"></i> Apply Now
          </a>
        ) : (
          <a href="/jobs" className="homejobs-apply-btn">
            View Details
          </a>
        )}
      </div>
    ))}
  </div>
</section>

{/* HOME LATEST DIRECTORY */}
<section className="homedir-section">
  <div className="homedir-head">
    <div>
      <h2>See Latest Directory</h2>
      <p>Verified businesses — updated automatically from directory page.</p>
    </div>

    <a href="/directory" className="homedir-more-btn">View More Directory</a>
  </div>

  <div className="homedir-grid">
    {homeDirectory.map((b, index) => (
      <div
        key={b.id}
        className="homedir-card homedir-animate"
        style={{ animationDelay: `${index * 0.08}s` }}
      >
        {/* IMAGE */}
        {b.business_image_url && (
          <div className="homedir-imgWrap">
            <img
              src={b.business_image_url}
              alt={b.business_name}
              className="homedir-img"
            />
          </div>
        )}

        {/* NAME + CATEGORY */}
        <div className="homedir-top">
          <h3 className="homedir-title">{b.business_name}</h3>
          <span className="homedir-badge">{b.category}</span>
        </div>

        {/* DETAILS */}
        <div className="homedir-info">
          <p><strong>City:</strong> {b.city}</p>
          <p><strong>State:</strong> {b.state}</p>
          <p><strong>Mobile:</strong> {b.mobile}</p>
        </div>

        {/* VISIT WEBSITE */}
        {b.website ? (
          <a
            href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="homedir-visit-btn"
          >
            Visit Website
          </a>
        ) : (
          <a href="/directory" className="homedir-visit-btn">
            View Details
          </a>
        )}
      </div>
    ))}
  </div>
</section>

{/* HOME LATEST CLASSIFIEDS */}
<section className="homecls-section">
  <div className="homecls-head">
    <div>
      <h2>See Latest Classifieds</h2>
      <p>Approved classifieds — updated automatically from classifieds page.</p>
    </div>

    <a href="/classifieds" className="homecls-more-btn">View More Classifieds</a>
  </div>

  <div className="homecls-grid">
    {homeClassifieds.map((ad, index) => {
      const showImage = ad.media_type === "image" && ad.media_url;
      const showVideo = ad.media_type === "video" && ad.youtube_url;

      return (
        <div
          key={ad.id}
          className="homecls-card homecls-animate"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          {/* MEDIA */}
          <div className="homecls-media">
            {showImage ? (
              <img src={ad.media_url} alt={ad.title || "Classified"} />
            ) : showVideo ? (
              <iframe
                src={toEmbedUrl(ad.youtube_url)}
                title={ad.title || "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="homecls-noMedia">
                <div className="homecls-noMediaTitle">{ad.category || "Classified"}</div>
                <div className="homecls-noMediaSub">No media uploaded</div>
              </div>
            )}

            {/* badges */}
            <div className="homecls-badges">
              <span className="homecls-badge">{ad.category}</span>
              {ad.sub_category ? (
                <span className="homecls-badge ghost">{ad.sub_category}</span>
              ) : null}
            </div>
          </div>

          {/* CONTENT */}
          <div className="homecls-body">
            <div className="homecls-top">
              <h3 className="homecls-title">{ad.title}</h3>
              <div className="homecls-price">{ad.price ? `$${ad.price}` : "NA"}</div>
            </div>

            <div className="homecls-meta">
              <span>{ad.city} • {ad.zip_code}</span>
              <span>{ad.region} • {ad.state}</span>
            </div>

            <p className="homecls-desc">{ad.description}</p>

            <div className="homecls-actions">
              {showVideo ? (
                <a className="homecls-btn ghost" href={ad.youtube_url} target="_blank" rel="noreferrer">
                  Watch Video
                </a>
              ) : (
                <a className="homecls-btn ghost" href="/classifieds">
                  View Details
                </a>
              )}
            </div>
          </div>
        </div>
      );
    })}

    {homeClassifieds.length === 0 && (
      <div className="homecls-empty">
        No classifieds yet. Once admin approves, they will show here.
      </div>
    )}
  </div>
</section>



      {/* CONTACT */}
<section className="contact">
  <div className="contact-wrapper">
    <div className="contact-card">

      <h2>Contact Us</h2>
      <p>Have questions or need support? We’d love to hear from you.</p>

      <form className="contact-form">

        <div className="input-row">
          <input type="text" placeholder="Your Name" />
          <input type="email" placeholder="Your Email" />
        </div>

        <div className="input-row">
          <input type="tel" placeholder="Mobile Number" />
          <input type="text" placeholder="Subject" />
        </div>

        <textarea rows="5" placeholder="Your Message"></textarea>

        <button type="submit">Send Message</button>

      </form>

    </div>
  </div>
</section>




    </div>
  );
}

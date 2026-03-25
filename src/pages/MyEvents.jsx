import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient"; // <-- adjust this path

const EVENT_CATEGORIES = {
  "Community Event": [
    "Meetup",
    "Charity Drive",
    "Awareness Program",
    "Volunteer Activity",
  ],
  "Business Event": [
    "Networking Event",
    "Business Launch",
    "Expo",
    "Seminar",
  ],
  Workshop: [
    "Skill Training",
    "Technical Workshop",
    "Career Guidance",
    "Certification Session",
  ],
  "Job Fair": [
    "Hiring Drive",
    "Career Fair",
    "Walk-in Interview",
    "Recruitment Event",
  ],
  "Cultural Program": [
    "Festival Celebration",
    "Music Event",
    "Dance Program",
    "Social Gathering",
  ],
};

const EVENT_STATUSES = ["all", "pending", "approved", "rejected", "completed", "cancelled"];

const INITIAL_FORM = {
  title: "",
  category: "",
  subcategory: "",
  description: "",
  organizer_name: "",
  organizer_phone: "",
  organizer_email: "",
  event_date: "",
  event_time: "",
  end_date: "",
  end_time: "",
  venue_name: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  registration_link: "",
  ticket_price: "",
  entry_type: "Free",
  banner_file: null,
};

const MyEvents = () => {
  const [activeTab, setActiveTab] = useState("post");
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [subcategories, setSubcategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && activeTab === "my-events") {
      fetchMyEvents();
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    const selected = formData.category ? EVENT_CATEGORIES[formData.category] || [] : [];
    setSubcategories(selected);

    if (!selected.includes(formData.subcategory)) {
      setFormData((prev) => ({ ...prev, subcategory: "" }));
    }
  }, [formData.category]);

  const filteredEvents = useMemo(() => {
    if (statusFilter === "all") return events;
    return events.filter((event) => (event.status || "").toLowerCase() === statusFilter);
  }, [events, statusFilter]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUser(user || null);
  };

  const fetchMyEvents = async () => {
    try {
      setLoadingEvents(true);
      setMessage({ type: "", text: "" });

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ownEvents = (data || []).filter(
        (item) => item.user_id === currentUser?.id
      );

      setEvents(ownEvents);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to fetch your events.",
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "banner_file") {
      setFormData((prev) => ({
        ...prev,
        banner_file: files && files[0] ? files[0] : null,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) return "Event title is required.";
    if (!formData.category) return "Event category is required.";
    if (!formData.description.trim()) return "Description is required.";
    if (!formData.organizer_name.trim()) return "Organizer name is required.";
    if (!formData.organizer_phone.trim()) return "Organizer phone is required.";
    if (!formData.organizer_email.trim()) return "Organizer email is required.";
    if (!formData.event_date) return "Event date is required.";
    if (!formData.event_time) return "Event time is required.";
    if (!formData.venue_name.trim()) return "Venue name is required.";
    if (!formData.city.trim()) return "City is required.";
    if (!formData.state.trim()) return "State is required.";
    if (!currentUser) return "Please login first.";

    return null;
  };

  const uploadBanner = async (file) => {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const fileName = `event-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `event-banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("event-media")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("event-media").getPublicUrl(filePath);

    return data?.publicUrl || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: "", text: "" });

      let bannerUrl = null;

      if (formData.banner_file) {
        bannerUrl = await uploadBanner(formData.banner_file);
      }

      const payload = {
        user_id: currentUser.id,
        title: formData.title.trim(),
        category: formData.category,
        subcategory: formData.subcategory || null,
        description: formData.description.trim(),
        organizer_name: formData.organizer_name.trim(),
        organizer_phone: formData.organizer_phone.trim(),
        organizer_email: formData.organizer_email.trim(),
        event_date: formData.event_date,
        event_time: formData.event_time,
        end_date: formData.end_date || null,
        end_time: formData.end_time || null,
        venue_name: formData.venue_name.trim(),
        address: formData.address.trim() || null,
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip_code: formData.zip_code.trim() || null,
        registration_link: formData.registration_link.trim() || null,
        ticket_price: formData.entry_type === "Paid" ? formData.ticket_price || null : null,
        entry_type: formData.entry_type,
        banner_url: bannerUrl,
        status: "pending",
      };

      const { error } = await supabase.from("events").insert([payload]);

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Event submitted successfully. It is now pending admin approval.",
      });

      setFormData(INITIAL_FORM);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to submit event.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this event?");
    if (!ok) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      setEvents((prev) => prev.filter((item) => item.id !== id));
      setMessage({ type: "success", text: "Event deleted successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to delete event.",
      });
    }
  };

  const updateEventStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setEvents((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );

      setMessage({
        type: "success",
        text: `Event marked as ${newStatus}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update event status.",
      });
    }
  };

  return (
    <>
      <style>{`
        .eventsPageWrap {
          max-width: 1180px;
          margin: 28px auto;
          padding: 0 16px 40px;
          box-sizing: border-box;
        }

        .eventsTopCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .eventsHero {
          padding: 24px 24px 10px;
          border-bottom: 1px solid #eef2f7;
          background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
        }

        .eventsTitle {
          margin: 0 0 8px;
          font-size: 30px;
          line-height: 1.2;
          color: #111827;
          font-weight: 700;
        }

        .eventsSubText {
          margin: 0;
          color: #6b7280;
          font-size: 15px;
          line-height: 1.7;
          max-width: 820px;
        }

        .eventsTabs {
          display: flex;
          gap: 10px;
          padding: 18px 24px 0;
          flex-wrap: wrap;
        }

        .eventsTabBtn {
          border: 1px solid #dbe2ea;
          background: #f8fafc;
          color: #334155;
          padding: 11px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .eventsTabBtn:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .eventsTabBtn.active {
          background: #16a34a;
          color: #ffffff;
          border-color: #2563eb;
        }

        .eventsBody {
          padding: 24px;
        }

        .eventsAlert {
          margin-bottom: 18px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.6;
        }

        .eventsAlert.success {
          background: #ecfdf3;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .eventsAlert.error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .eventsSectionGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .eventsFieldBlock {
          margin-bottom: 18px;
        }

        .eventsLabel {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .eventsInput,
        .eventsSelect,
        .eventsTextarea,
        .eventsFileInput {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: #fff;
          color: #111827;
          font-size: 14px;
          padding: 12px 14px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .eventsTextarea {
          min-height: 120px;
          resize: vertical;
        }

        .eventsInput:focus,
        .eventsSelect:focus,
        .eventsTextarea:focus,
        .eventsFileInput:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .eventsHint {
          margin-top: 6px;
          font-size: 12px;
          color: #6b7280;
        }

        .eventsActions {
          display: flex;
          gap: 12px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .eventsPrimaryBtn,
        .eventsSecondaryBtn,
        .eventsDangerBtn,
        .eventsSmallBtn {
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
        }

        .eventsPrimaryBtn {
          background: #16a34a;
          color: white;
          padding: 13px 18px;
          min-width: 180px;
        }

        .eventsPrimaryBtn:hover {
          background: #1d4ed8;
        }

        .eventsPrimaryBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .eventsSecondaryBtn {
          background: #e2e8f0;
          color: #0f172a;
          padding: 13px 18px;
        }

        .eventsSecondaryBtn:hover {
          background: #cbd5e1;
        }

        .eventsFilterBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .eventsFilterLeft {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .eventsCardList {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .eventsCard {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .eventsCardInner {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 0;
        }

        .eventsCardMedia {
          background: #f8fafc;
          min-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-right: 1px solid #eef2f7;
        }

        .eventsCardMedia img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .eventsCardNoMedia {
          padding: 20px;
          color: #94a3b8;
          font-size: 14px;
          text-align: center;
        }

        .eventsCardContent {
          padding: 18px;
        }

        .eventsStatusRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .eventsBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .eventsBadge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .eventsBadge.approved {
          background: #dcfce7;
          color: #166534;
        }

        .eventsBadge.rejected {
          background: #fee2e2;
          color: #b91c1c;
        }

        .eventsBadge.completed {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .eventsBadge.cancelled {
          background: #e5e7eb;
          color: #374151;
        }

        .eventsCardTitle {
          margin: 0 0 8px;
          font-size: 22px;
          line-height: 1.3;
          color: #111827;
          font-weight: 700;
        }

        .eventsMetaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 18px;
          margin: 14px 0;
        }

        .eventsMetaItem {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
        }

        .eventsMetaItem strong {
          color: #111827;
        }

        .eventsDesc {
          margin: 8px 0 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .eventsCardBtns {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .eventsSmallBtn {
          padding: 10px 14px;
          font-size: 13px;
        }

        .eventsSmallBtn.complete {
          background: #2563eb;
          color: #fff;
        }

        .eventsSmallBtn.complete:hover {
          background: #1d4ed8;
        }

        .eventsSmallBtn.cancel {
          background: #f59e0b;
          color: #fff;
        }

        .eventsSmallBtn.cancel:hover {
          background: #d97706;
        }

        .eventsDangerBtn {
          background: #ef4444;
          color: #fff;
          padding: 10px 14px;
          font-size: 13px;
        }

        .eventsDangerBtn:hover {
          background: #dc2626;
        }

        .eventsEmpty {
          border: 1px dashed #cbd5e1;
          border-radius: 16px;
          padding: 34px 20px;
          text-align: center;
          background: #f8fafc;
          color: #64748b;
        }

        .eventsLoader {
          font-size: 14px;
          color: #64748b;
        }

        @media (max-width: 900px) {
          .eventsSectionGrid,
          .eventsMetaGrid,
          .eventsCardInner {
            grid-template-columns: 1fr;
          }

          .eventsCardMedia {
            border-right: none;
            border-bottom: 1px solid #eef2f7;
            min-height: 220px;
          }
        }

        @media (max-width: 640px) {
          .eventsHero,
          .eventsTabs,
          .eventsBody {
            padding-left: 16px;
            padding-right: 16px;
          }

          .eventsTitle {
            font-size: 25px;
          }

          .eventsPrimaryBtn,
          .eventsSecondaryBtn {
            width: 100%;
          }

          .eventsCardBtns {
            flex-direction: column;
          }

          .eventsDangerBtn,
          .eventsSmallBtn {
            width: 100%;
          }
        }
      `}</style>

      <div className="eventsPageWrap">
        <div className="eventsTopCard">
          <div className="eventsHero">
            <h2 className="eventsTitle">Events</h2>
            <p className="eventsSubText">
              Create and manage your events in a trusted community space. Submit
              your event for admin approval and track all posted events from one place.
            </p>
          </div>

          <div className="eventsTabs">
            <button
              type="button"
              className={`eventsTabBtn ${activeTab === "post" ? "active" : ""}`}
              onClick={() => setActiveTab("post")}
            >
              Post Event
            </button>

            <button
              type="button"
              className={`eventsTabBtn ${activeTab === "my-events" ? "active" : ""}`}
              onClick={() => setActiveTab("my-events")}
            >
              My Events
            </button>
          </div>

          <div className="eventsBody">
            {message.text ? (
              <div className={`eventsAlert ${message.type}`}>
                {message.text}
              </div>
            ) : null}

            {activeTab === "post" && (
              <form onSubmit={handleSubmit}>
                <div className="eventsSectionGrid">
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Event Title</label>
                    <input
                      type="text"
                      name="title"
                      className="eventsInput"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter event title"
                    />
                  </div>

                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Event Category</label>
                    <select
                      name="category"
                      className="eventsSelect"
                      value={formData.category}
                      onChange={handleChange}
                    >
                      <option value="">Select Category</option>
                      {Object.keys(EVENT_CATEGORIES).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="eventsSectionGrid">
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Sub Category</label>
                    <select
                      name="subcategory"
                      className="eventsSelect"
                      value={formData.subcategory}
                      onChange={handleChange}
                      disabled={!formData.category}
                    >
                      <option value="">Select Sub Category</option>
                      {subcategories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Entry Type</label>
                    <select
                      name="entry_type"
                      className="eventsSelect"
                      value={formData.entry_type}
                      onChange={handleChange}
                    >
                      <option value="Free">Free</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>

                {formData.entry_type === "Paid" && (
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Ticket Price</label>
                    <input
                      type="number"
                      name="ticket_price"
                      className="eventsInput"
                      value={formData.ticket_price}
                      onChange={handleChange}
                      placeholder="Enter ticket price"
                    />
                  </div>
                )}

                <div className="eventsFieldBlock">
                  <label className="eventsLabel">Event Description</label>
                  <textarea
                    name="description"
                    className="eventsTextarea"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Write full event details..."
                  />
                </div>

                <div className="eventsSectionGrid">
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Organizer Name</label>
                    <input
                      type="text"
                      name="organizer_name"
                      className="eventsInput"
                      value={formData.organizer_name}
                      onChange={handleChange}
                      placeholder="Enter organizer name"
                    />
                  </div>

                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Organizer Phone</label>
                    <input
                      type="text"
                      name="organizer_phone"
                      className="eventsInput"
                      value={formData.organizer_phone}
                      onChange={handleChange}
                      placeholder="Enter organizer phone"
                    />
                  </div>
                </div>

                <div className="eventsFieldBlock">
                  <label className="eventsLabel">Organizer Email</label>
                  <input
                    type="email"
                    name="organizer_email"
                    className="eventsInput"
                    value={formData.organizer_email}
                    onChange={handleChange}
                    placeholder="Enter organizer email"
                  />
                </div>

                <div className="eventsSectionGrid">
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Event Date</label>
                    <input
                      type="date"
                      name="event_date"
                      className="eventsInput"
                      value={formData.event_date}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Event Time</label>
                    <input
                      type="time"
                      name="event_time"
                      className="eventsInput"
                      value={formData.event_time}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="eventsSectionGrid">
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">End Date</label>
                    <input
                      type="date"
                      name="end_date"
                      className="eventsInput"
                      value={formData.end_date}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">End Time</label>
                    <input
                      type="time"
                      name="end_time"
                      className="eventsInput"
                      value={formData.end_time}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="eventsFieldBlock">
                  <label className="eventsLabel">Venue Name</label>
                  <input
                    type="text"
                    name="venue_name"
                    className="eventsInput"
                    value={formData.venue_name}
                    onChange={handleChange}
                    placeholder="Enter venue name"
                  />
                </div>

                <div className="eventsFieldBlock">
                  <label className="eventsLabel">Address</label>
                  <input
                    type="text"
                    name="address"
                    className="eventsInput"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter event address"
                  />
                </div>

                <div className="eventsSectionGrid">
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">City</label>
                    <input
                      type="text"
                      name="city"
                      className="eventsInput"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">State</label>
                    <input
                      type="text"
                      name="state"
                      className="eventsInput"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Enter state"
                    />
                  </div>
                </div>

                <div className="eventsSectionGrid">
                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Zip Code</label>
                    <input
                      type="text"
                      name="zip_code"
                      className="eventsInput"
                      value={formData.zip_code}
                      onChange={handleChange}
                      placeholder="Enter zip code"
                    />
                  </div>

                  <div className="eventsFieldBlock">
                    <label className="eventsLabel">Registration Link</label>
                    <input
                      type="url"
                      name="registration_link"
                      className="eventsInput"
                      value={formData.registration_link}
                      onChange={handleChange}
                      placeholder="Enter registration link"
                    />
                  </div>
                </div>

                <div className="eventsFieldBlock">
                  <label className="eventsLabel">Event Banner</label>
                  <input
                    type="file"
                    name="banner_file"
                    className="eventsFileInput"
                    accept="image/*"
                    onChange={handleChange}
                  />
                  <div className="eventsHint">
                    Upload a banner image for your event.
                  </div>
                </div>

                <div className="eventsActions">
                  <button
                    type="submit"
                    className="eventsPrimaryBtn"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Event"}
                  </button>

                  <button
                    type="button"
                    className="eventsSecondaryBtn"
                    onClick={() => {
                      setFormData(INITIAL_FORM);
                      setMessage({ type: "", text: "" });
                    }}
                  >
                    Reset Form
                  </button>
                </div>
              </form>
            )}

            {activeTab === "my-events" && (
              <div>
                <div className="eventsFilterBar">
                  <div className="eventsFilterLeft">
                    <label className="eventsLabel" style={{ marginBottom: 0 }}>
                      Filter by Status
                    </label>
                    <select
                      className="eventsSelect"
                      style={{ minWidth: "180px" }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {EVENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status === "all"
                            ? "All Events"
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="eventsSecondaryBtn"
                    onClick={fetchMyEvents}
                  >
                    Refresh
                  </button>
                </div>

                {loadingEvents ? (
                  <div className="eventsLoader">Loading your events...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="eventsEmpty">
                    No events found for the selected status.
                  </div>
                ) : (
                  <div className="eventsCardList">
                    {filteredEvents.map((event) => (
                      <div className="eventsCard" key={event.id}>
                        <div className="eventsCardInner">
                          <div className="eventsCardMedia">
                            {event.banner_url ? (
                              <img src={event.banner_url} alt={event.title} />
                            ) : (
                              <div className="eventsCardNoMedia">
                                No banner uploaded
                              </div>
                            )}
                          </div>

                          <div className="eventsCardContent">
                            <div className="eventsStatusRow">
                              <span className={`eventsBadge ${event.status || "pending"}`}>
                                {event.status || "pending"}
                              </span>
                            </div>

                            <h3 className="eventsCardTitle">{event.title}</h3>

                            <div className="eventsMetaGrid">
                              <div className="eventsMetaItem">
                                <strong>Category:</strong> {event.category || "-"}
                              </div>
                              <div className="eventsMetaItem">
                                <strong>Subcategory:</strong> {event.subcategory || "-"}
                              </div>
                              <div className="eventsMetaItem">
                                <strong>Date:</strong> {event.event_date || "-"}
                              </div>
                              <div className="eventsMetaItem">
                                <strong>Time:</strong> {event.event_time || "-"}
                              </div>
                              <div className="eventsMetaItem">
                                <strong>Venue:</strong> {event.venue_name || "-"}
                              </div>
                              <div className="eventsMetaItem">
                                <strong>City:</strong> {event.city || "-"}
                              </div>
                              <div className="eventsMetaItem">
                                <strong>Organizer:</strong> {event.organizer_name || "-"}
                              </div>
                              <div className="eventsMetaItem">
                                <strong>Entry:</strong> {event.entry_type || "Free"}
                              </div>
                            </div>

                            <p className="eventsDesc">{event.description || "-"}</p>

                            <div className="eventsCardBtns">
                              {event.status === "approved" && (
                                <>
                                  <button
                                    type="button"
                                    className="eventsSmallBtn complete"
                                    onClick={() => updateEventStatus(event.id, "completed")}
                                  >
                                    Mark Completed
                                  </button>

                                  <button
                                    type="button"
                                    className="eventsSmallBtn cancel"
                                    onClick={() => updateEventStatus(event.id, "cancelled")}
                                  >
                                    Cancel Event
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                className="eventsDangerBtn"
                                onClick={() => handleDelete(event.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MyEvents;
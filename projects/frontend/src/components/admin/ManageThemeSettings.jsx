import { useState } from "react";
import { useTheme, THEME_PALETTES } from "../../context/ThemeContext";
import {
  FaPalette,
  FaBars,
  FaThLarge,
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaArrowUp,
  FaArrowDown,
  FaSave,
  FaPlus,
  FaTrash,
} from "react-icons/fa";

export default function ManageThemeSettings() {
  const {
    theme,
    setTheme,
    headerMenu,
    setHeaderMenu,
    homepageWidgets,
    setHomepageWidgets,
    footerText,
    setFooterText,
    saveSettings,
  } = useTheme();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "info" });

  // Custom link state
  const [newLabel, setNewLabel] = useState("");
  const [newPath, setNewPath] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  };

  // --- Menu Handlers ---
  const toggleMenuVisibility = (id) => {
    setHeaderMenu(
      headerMenu.map((item) =>
        item.id === id ? { ...item, is_visible: !item.is_visible } : item
      )
    );
  };

  const moveMenuItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= headerMenu.length) return;

    const copy = [...headerMenu];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // Update sort_order numbers
    const updated = copy.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setHeaderMenu(updated);
  };

  const handleAddCustomLink = (e) => {
    e.preventDefault();
    if (!newLabel || !newPath) return;

    const newItem = {
      id: `custom_${Date.now()}`,
      label: newLabel.trim(),
      path: newPath.trim(),
      is_visible: true,
      sort_order: headerMenu.length + 1,
    };

    setHeaderMenu([...headerMenu, newItem]);
    setNewLabel("");
    setNewPath("");
    setAddingLink(false);
    showToast(`Added '${newItem.label}' to navigation menu!`, "success");
  };

  const handleDeleteMenuItem = (id) => {
    if (headerMenu.length <= 1) {
      showToast("Cannot delete the last remaining menu link", "error");
      return;
    }
    setHeaderMenu(headerMenu.filter((m) => m.id !== id));
  };

  // --- Widget Handlers ---
  const toggleWidgetEnabled = (key) => {
    setHomepageWidgets(
      homepageWidgets.map((w) =>
        w.key === key ? { ...w, is_enabled: !w.is_enabled } : w
      )
    );
  };

  const moveWidget = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= homepageWidgets.length) return;

    const copy = [...homepageWidgets];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const updated = copy.map((w, idx) => ({ ...w, sort_order: idx + 1 }));
    setHomepageWidgets(updated);
  };

  // --- Save All Settings ---
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await saveSettings({
        theme,
        header_menu: headerMenu,
        homepage_widgets: homepageWidgets,
        footer_text: footerText,
      });
      showToast("Platform appearance and layout settings saved successfully! ✅", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="manage-theme">
      <div className="theme-header">
        <div>
          <h2>🎨 Theme, Menus & Homepage Layout</h2>
          <p>Configure platform visual design, top navigation menus, and homepage section order</p>
        </div>
        <button
          className="save-all-btn"
          onClick={handleSaveAll}
          disabled={saving}
        >
          <FaSave /> {saving ? "Saving Settings..." : "Save Appearance Settings"}
        </button>
      </div>

      {toast.msg && <div className={`theme-toast ${toast.type}`}>{toast.msg}</div>}

      {/* 1. THEME PICKER */}
      <section className="theme-section">
        <div className="section-title">
          <FaPalette /> <h3>Select Platform Theme</h3>
        </div>
        <div className="theme-cards-grid">
          {Object.entries(THEME_PALETTES).map(([key, p]) => {
            const isSelected = theme === key;
            return (
              <div
                key={key}
                className={`theme-card ${isSelected ? "selected" : ""}`}
                onClick={() => setTheme(key)}
              >
                <div className="card-top">
                  <div
                    className="palette-swatch"
                    style={{ background: p.bannerGradient }}
                  />
                  {isSelected && <span className="active-tag"><FaCheck /> Active</span>}
                </div>
                <div className="card-body">
                  <h4>{p.name}</h4>
                  <p>{p.description}</p>
                  <div className="color-dots">
                    <span className="dot" style={{ background: p.primary }} title="Primary" />
                    <span className="dot" style={{ background: p.primaryHover }} title="Hover" />
                    <span className="dot" style={{ background: p.primaryLight }} title="Accent Background" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. MENU MANAGER */}
      <section className="theme-section">
        <div className="section-title-between">
          <div className="section-title">
            <FaBars /> <h3>Header Navigation Menu (Top Bar)</h3>
          </div>
          <button
            type="button"
            className="add-link-btn"
            onClick={() => setAddingLink(!addingLink)}
          >
            <FaPlus /> {addingLink ? "Cancel" : "Add Custom Link"}
          </button>
        </div>

        {addingLink && (
          <form onSubmit={handleAddCustomLink} className="add-link-form">
            <input
              type="text"
              placeholder="Link Label (e.g. Donate, Blog)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Destination Path (e.g. /donate, /about)"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              required
            />
            <button type="submit" className="confirm-btn">
              Add Link
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="theme-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Menu Label</th>
                <th>Destination Route</th>
                <th>Visibility</th>
                <th>Reorder</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {headerMenu.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <span className="order-chip">#{index + 1}</span>
                  </td>
                  <td>
                    <strong>{item.label}</strong>
                  </td>
                  <td>
                    <code>{item.path}</code>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`toggle-vis-btn ${item.is_visible ? "visible" : "hidden"}`}
                      onClick={() => toggleMenuVisibility(item.id)}
                    >
                      {item.is_visible ? (
                        <>
                          <FaEye /> Visible
                        </>
                      ) : (
                        <>
                          <FaEyeSlash /> Hidden
                        </>
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="order-btns">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveMenuItem(index, -1)}
                        className="arrow-btn"
                        title="Move Up"
                      >
                        <FaArrowUp />
                      </button>
                      <button
                        type="button"
                        disabled={index === headerMenu.length - 1}
                        onClick={() => moveMenuItem(index, 1)}
                        className="arrow-btn"
                        title="Move Down"
                      >
                        <FaArrowDown />
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="delete-item-btn"
                      onClick={() => handleDeleteMenuItem(item.id)}
                      title="Delete menu item"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. HOMEPAGE WIDGETS MANAGER */}
      <section className="theme-section">
        <div className="section-title">
          <FaThLarge /> <h3>Homepage Section Widgets</h3>
        </div>
        <p className="section-desc">
          Arrange and toggle the modules rendered on the public landing page (<code>/</code>).
        </p>

        <div className="widgets-list">
          {homepageWidgets.map((w, index) => (
            <div key={w.key} className={`widget-row ${w.is_enabled ? "enabled" : "disabled"}`}>
              <div className="widget-info">
                <span className="order-chip">#{index + 1}</span>
                <div>
                  <strong>{w.title}</strong>
                  <span className="widget-key"><code>{w.key}</code></span>
                </div>
              </div>
              <div className="widget-actions">
                <button
                  type="button"
                  className={`toggle-vis-btn ${w.is_enabled ? "visible" : "hidden"}`}
                  onClick={() => toggleWidgetEnabled(w.key)}
                >
                  {w.is_enabled ? (
                    <>
                      <FaEye /> Enabled
                    </>
                  ) : (
                    <>
                      <FaEyeSlash /> Disabled
                    </>
                  )}
                </button>
                <div className="order-btns">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveWidget(index, -1)}
                    className="arrow-btn"
                    title="Move Up"
                  >
                    <FaArrowUp />
                  </button>
                  <button
                    type="button"
                    disabled={index === homepageWidgets.length - 1}
                    onClick={() => moveWidget(index, 1)}
                    className="arrow-btn"
                    title="Move Down"
                  >
                    <FaArrowDown />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FOOTER BRANDING */}
      <section className="theme-section">
        <div className="section-title">
          <h3>Footer Copyright & Disclaimer</h3>
        </div>
        <div className="footer-form-group">
          <input
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="e.g. © 2026 CommunityHub. Empowering non-profits."
          />
        </div>
      </section>

      {/* STYLES */}
      <style>{`
        .manage-theme {
          font-family: 'Inter', system-ui, sans-serif;
        }

        .theme-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .theme-header h2 {
          margin: 0 0 6px 0;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
        }

        .theme-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .save-all-btn {
          background: #0f766e;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .save-all-btn:hover {
          background: #115e59;
        }

        .theme-toast {
          padding: 12px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 600;
          font-size: 14px;
        }

        .theme-toast.success { background: #dcfce7; color: #166534; }
        .theme-toast.error { background: #fee2e2; color: #991b1b; }

        .theme-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #0f172a;
        }

        .section-title h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .section-title-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-desc {
          margin: 6px 0 18px;
          color: #64748b;
          font-size: 14px;
        }

        /* THEME CARDS */
        .theme-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
          margin-top: 16px;
        }

        .theme-card {
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          background: #ffffff;
        }

        .theme-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
        }

        .theme-card.selected {
          border-color: #0f766e;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.18);
        }

        .card-top {
          position: relative;
          height: 90px;
        }

        .palette-swatch {
          width: 100%;
          height: 100%;
        }

        .active-tag {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #0f766e;
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .card-body {
          padding: 16px;
        }

        .card-body h4 {
          margin: 0 0 6px 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .card-body p {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.4;
        }

        .color-dots {
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: inline-block;
          border: 1px solid rgba(0,0,0,0.1);
        }

        /* TABLES */
        .theme-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }

        .theme-table th, .theme-table td {
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }

        .theme-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
        }

        .order-chip {
          display: inline-block;
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .toggle-vis-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        .toggle-vis-btn.visible { background: #dcfce7; color: #166534; }
        .toggle-vis-btn.hidden { background: #f1f5f9; color: #64748b; }

        .order-btns {
          display: flex;
          gap: 4px;
        }

        .arrow-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
        }

        .arrow-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .delete-item-btn {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
        }

        .add-link-btn {
          background: #f1f5f9;
          color: #0f766e;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }

        .add-link-form {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
        }

        .add-link-form input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 14px;
        }

        .confirm-btn {
          background: #0f766e;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        /* WIDGETS LIST */
        .widgets-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .widget-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.15s;
        }

        .widget-row.disabled {
          opacity: 0.6;
          background: #f1f5f9;
        }

        .widget-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .widget-key {
          margin-left: 8px;
          font-size: 12px;
        }

        .widget-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .footer-form-group input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

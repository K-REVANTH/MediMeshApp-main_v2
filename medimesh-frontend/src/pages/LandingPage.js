import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const architectureDiagrams = [
  {
    src: '/images/Appdiagram.jpg',
    title: 'Application Architecture',
    description: 'Overview of the MediMesh microservices application layer'
  },
  {
    src: '/images/dbdiagram.jpg',
    title: 'Database Architecture',
    description: 'MongoDB ReplicaSet and data persistence design'
  },
  {
    src: '/images/mainarch.jpg',
    title: 'Main Architecture',
    description: 'End-to-end infrastructure and Kubernetes deployment layout'
  }
];

export default function LandingPage() {
  const [showArch, setShowArch] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  return (
    <div className="landing-page">
      <div className="hero">
        <div className="hero-content">
          <div className="hero-icon">🏥</div>
          <h1>Medi<span>Mesh</span></h1>
          <p>Smart Hospital Management System — Connecting Patients, Doctors, and Healthcare Services seamlessly.</p>
          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary" id="landing-login-btn">Login to Dashboard</Link>
            <Link to="/register" className="btn btn-outline" id="landing-register-btn">Create Account</Link>
          </div>

          {/* ── Architecture & PPT Buttons ── */}
          <div className="hero-buttons" style={{ marginTop: '16px' }}>
            <button
              className="btn btn-glass"
              id="view-architecture-btn"
              onClick={() => setShowArch(true)}
            >
              📐 View Architecture
            </button>
            <a
              href="https://github.com/Bharath-1602/PPT"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-glass"
              id="project-ppt-btn"
            >
              📊 Project PPT
            </a>
          </div>

          <div className="hero-features">
            <div className="hero-feature-card">
              <div className="feature-icon">📅</div>
              <h3>Appointments</h3>
              <p>Book and manage appointments with top specialists</p>
            </div>
            <div className="hero-feature-card">
              <div className="feature-icon">💊</div>
              <h3>Pharmacy</h3>
              <p>Browse medicine inventory and availability</p>
            </div>
            <div className="hero-feature-card">
              <div className="feature-icon">🚑</div>
              <h3>Ambulance</h3>
              <p>Real-time ambulance availability tracking</p>
            </div>
            <div className="hero-feature-card">
              <div className="feature-icon">❤️</div>
              <h3>Vitals</h3>
              <p>Track patient health vitals and records</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Architecture Diagrams Modal ── */}
      {showArch && (
        <div className="arch-modal-overlay" onClick={() => { setShowArch(false); setActiveImage(null); }}>
          <div className="arch-modal" onClick={e => e.stopPropagation()}>
            <div className="arch-modal-header">
              <h2>🏗️ MediMesh Architecture</h2>
              <button className="arch-modal-close" onClick={() => { setShowArch(false); setActiveImage(null); }}>✕</button>
            </div>
            <div className="arch-modal-body">
              {architectureDiagrams.map((diagram, index) => (
                <div
                  className="arch-image-card"
                  key={index}
                  style={{ animationDelay: `${index * 0.12}s` }}
                >
                  <div className="arch-image-number">{index + 1}</div>
                  <h3>{diagram.title}</h3>
                  <p className="arch-image-desc">{diagram.description}</p>
                  <img
                    src={diagram.src}
                    alt={diagram.title}
                    className="arch-image"
                    onClick={() => setActiveImage(diagram)}
                  />
                </div>
              ))}
            </div>
            <div className="arch-modal-footer">
              <a
                href="https://github.com/Bharath-1602/PPT"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                📊 View Full PPT on GitHub
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowArch(false); setActiveImage(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Image Lightbox ── */}
      {activeImage && (
        <div className="arch-lightbox" onClick={() => setActiveImage(null)}>
          <div className="arch-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="arch-lightbox-close" onClick={() => setActiveImage(null)}>✕</button>
            <h3>{activeImage.title}</h3>
            <img src={activeImage.src} alt={activeImage.title} />
          </div>
        </div>
      )}
    </div>
  );
}

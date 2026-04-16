"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/signals")
      .then(res => res.json())
      .then(data => setSignals(data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Signals</h1>

      {signals.map((s: any, i: number) => (
        <div key={i}>
          <p>{s.content}</p>
          <small>{s.sentiment}</small>
        </div>
      ))}
    </div>
  );
}

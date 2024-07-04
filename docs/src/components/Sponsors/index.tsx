import React, { useState, useEffect } from "react";

interface Sponsor {
  username: string;
  avatar: string;
}

interface SponsorsData {
  current: Sponsor[] | null;
  past: Sponsor[];
}

interface SponsorsResponse {
  status: string;
  sponsors: SponsorsData;
}

interface SponsorsProps {
  username: string;
}

export function Sponsors({ username }) {
  const [sponsors, setSponsors] = useState<SponsorsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const response = await fetch(`https://ghs.vercel.app/v3/sponsors/${username}`);
        if (!response.ok) {
          throw new Error("Failed to fetch sponsors");
        }
        const data: SponsorsResponse = await response.json();
        if (data.status === "success") {
          setSponsors(data.sponsors);
        } else {
          throw new Error("Failed to fetch sponsors");
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchSponsors();
  }, [username]);

  if (loading) return <div>Loading sponsors...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!sponsors) return <div>No sponsor data available.</div>;


  const all = [
    ...(sponsors.current ? sponsors.current : []),
    ...(sponsors.past ? sponsors.past : []),
  ];

  return (
    <>
      {all && all.length > 0 ? (
        <ul className="flex flex-wrap gap-4 list-none">
          {all.map((sponsor) => (
            <li key={sponsor.username} className="">
              <a href={`https://github.com/${sponsor.username}`} className="block"
                 title={`${sponsor.username}`}>
                <img
                  src={sponsor.avatar}
                  alt={sponsor.username}
                  width="50"
                  height="50"
                  className="rounded-full border-2 border-transparent group-hover:border-blue-500 transition-colors duration-200"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No sponsors.</p>
      )}
    </>
  );
}

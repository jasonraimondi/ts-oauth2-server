import React, { useState, useEffect } from "react";

interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

interface ContributorsProps {
  owner: string;
  repo: string;
}

export function Contributors({ owner, repo }: ContributorsProps) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`);
        if (!response.ok) {
          throw new Error("Failed to fetch contributors");
        }
        const data: Contributor[] = await response.json();
        setContributors(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchContributors();
  }, [owner, repo]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul className="flex flex-wrap gap-4 list-none">
      {contributors.map((contributor) => (
        <li key={contributor.login} className="">
          <a href={`https://github.com/${contributor.login}`} className="block"
             title={`${contributor.login} (${contributor.contributions} contributions)`}>
            <img
              src={contributor.avatar_url}
              alt={contributor.login}
              width="50"
              height="50"
              className="rounded-full border-2 border-transparent group-hover:border-blue-500 transition-colors duration-200"
            />
          </a>
        </li>
      ))}
    </ul>
  );
};

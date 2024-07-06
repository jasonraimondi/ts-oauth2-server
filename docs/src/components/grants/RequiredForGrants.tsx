export default function RequiredForGrants(props) {
  const enabledGrants = props.grants;
  const allGrants = [
    {
      label: "Authorization Code",
      href: "authorization_code",
    },
    {
      label: "Client Credentials",
      href: "client_credentials",
    },
    {
      label: "Refresh Token",
      href: "refresh_token",
    },
    {
      label: "Password",
      href: "password",
    },
    {
      label: "Implicit",
      href: "implicit",
    },
    {
      label: "Custom",
      href: "custom",
    },
  ] as const;

  const grants = allGrants.filter(g => enabledGrants.includes(g.href));

  return (
    <div className="pb-4 text-sm font-semibold">
      <span>Used in Grants: </span>
      <span className="inline-flex gap-2 list-none pl-0">
        {grants.map(s => (
          <a
            key={s.label}
            href={`/docs/grants/${s.href}`}
            className=" bg-[--ifm-color-primary] text-white hover:text-white hover:no-underline rounded"
          >
            {s.label}
          </a>
        ))}
      </span>
    </div>
  );
}

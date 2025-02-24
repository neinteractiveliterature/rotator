import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rotator" },
    {
      name: "description",
      content: "On-call rotation phone forwarding system",
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const phoneNumbers = await context.db.query.phoneNumbersTable.findMany();
  return { phoneNumbers };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <h1>Phone numbers</h1>
      <ul className="list-group">
        {loaderData.phoneNumbers.map((phoneNumber) => (
          <li key={phoneNumber.id} className="list-group-item">
            <Link to={`/phone_numbers/${phoneNumber.id}`}>
              {phoneNumber.phoneNumber}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

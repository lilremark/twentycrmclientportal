import { createClientAccountAction } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { clientAccounts } from "@/lib/db/schema";

export default async function ClientsPage() {
  const clients = await db.select().from(clientAccounts);
  return (
    <div className="grid gap-6">
      <form action={createClientAccountAction} className="card grid gap-4 p-5">
        <h2 className="text-lg font-bold">Add client account</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="field">
            <label htmlFor="name">Client name</label>
            <input className="input" id="name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="twentyCompanyId">Twenty Company ID</label>
            <input
              className="input"
              id="twentyCompanyId"
              name="twentyCompanyId"
              placeholder="UUID from Twenty"
              required
            />
          </div>
        </div>
        <button className="button w-fit" type="submit">
          Add client
        </button>
      </form>
      <section className="card overflow-hidden">
        <div className="border-b border-[#dde3ed] p-5">
          <h2 className="text-lg font-bold">Client accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8f9fc] text-[#68758a]">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Twenty Company ID</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr className="border-t border-[#edf0f5]" key={client.id}>
                  <td className="p-4 font-semibold">{client.name}</td>
                  <td className="p-4 font-mono text-xs">
                    {client.twentyCompanyId}
                  </td>
                  <td className="p-4">
                    <span className="badge">
                      {client.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

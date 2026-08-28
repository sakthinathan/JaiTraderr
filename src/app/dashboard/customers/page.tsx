import React from "react";
import { getCustomersList } from "@/app/actions/customers";
import CustomersClient from "@/components/customers-client";

export default async function CustomersPage() {
  const customers = await getCustomersList();

  return <CustomersClient initialCustomers={customers} />;
}

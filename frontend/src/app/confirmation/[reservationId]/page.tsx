import type { Metadata } from "next";
import { BookingConfirmation } from "@/components/booking-confirmation";

export const metadata: Metadata = { title: "Booking confirmation" };

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  return <BookingConfirmation reservationId={reservationId} />;
}

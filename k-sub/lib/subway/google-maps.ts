/** Build a Google Maps directions URL (opens in Maps / browser). */
export function googleMapsDirectionsUrl(
  originLabel: string,
  destinationLabel: string,
): string {
  const origin = `${originLabel.trim()}, Seoul`;
  const destination = `${destinationLabel.trim()}, Seoul`;
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "transit",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

import { DISTRIBUTION_CHANNELS } from "@/lib/seo-entities";

export type FaqItem = { question: string; answer: string };

const CHANNELS = DISTRIBUTION_CHANNELS.join(", ");

/**
 * FAQ de la home: única fuente de verdad, usada tanto para el `FAQPage` JSON-LD
 * (app/layout.tsx) como para la sección visible en la home (app/(public)/page.tsx),
 * así el schema siempre coincide exactamente con el contenido que ve el huésped.
 *
 * Todo dato de ubicación, capacidad, camas y amenidades está tomado de las fichas
 * reales de las 9 propiedades (Isla Mujeres, Colonia Centro / Punta Norte). No agregar
 * afirmaciones sin verificar — el contenido engañoso perjudica tanto SEO como confianza.
 */
export function getHomeFaq(locale: "es" | "en"): FaqItem[] {
  if (locale === "en") {
    return [
      {
        question: "Where are Punta Norte Rentals properties located?",
        answer:
          "All our properties are in the Colonia Centro / Punta Norte area of Isla Mujeres, Quintana Roo, Mexico — a few blocks from one another.",
      },
      {
        question: "What is within walking distance of the properties?",
        answer:
          "A few blocks on foot: Playa Norte, Playa Centro, Playa Media Luna, the Malecón boardwalk, Hidalgo pedestrian street, the Ferry Ultramar dock, Avenida Rueda Medina, the town's main church (Iglesia Principal), the Super Akí supermarket, and the Palacio Municipal (town hall).",
      },
      {
        question: "What else can I visit on Isla Mujeres near the properties?",
        answer:
          "A short taxi, golf cart, or bike ride away: Playa Lancheros, Playa Paraíso, Garrafón Reef Park, Punta Sur and its Ixchel Temple ruins, the Punta Sur lighthouse, the Tortugranja turtle sanctuary, Dolphin Discovery, Hacienda Mundaca, the island's historic cemetery, the Mercado Municipal, Laguna Makax, and the Zona Hotelera. Boat excursions to Manchones Reef, the MUSA underwater art museum, and Isla Contoy also depart from the island.",
      },
      {
        question: "What types of accommodation do you offer, and for how many guests?",
        answer:
          "Studios for 2–3 guests, private ensuite rooms inside La Casa Naranja guesthouse for 4–5 guests, family apartments for up to 5 guests, and the full La Casa Naranja house (3 bedrooms) for groups of 1 to 14. All units include air conditioning, Wi-Fi, and TV.",
      },
      {
        question: "How many beds does each property have?",
        answer:
          "It varies by unit: our studios have 1 or 2 beds (a double + single, or one queen bed), the private rooms and family apartments have 2 or 3 beds (queen, double and single, or a king plus a bunk), and the full La Casa Naranja house has 3 bedrooms with 7 beds in total (2 queen, 2 double, 2 single, and 1 bunk).",
      },
      {
        question: "Do all properties have a kitchen, A/C, Wi-Fi and TV?",
        answer:
          "Air conditioning, Wi-Fi, and TV are included in every unit. Most also include a kitchen — private or shared — with stove, fridge, microwave, coffee maker, and cookware. The one exception is our most compact 14 m² studio, which has no full kitchen (it does include a microwave, coffee maker, and basic dishware).",
      },
      {
        question: "Which properties have a balcony?",
        answer:
          "Two of our upper-floor studios have a private balcony: the Cozy Balcony Studio and the Charming Studio with Balcony, both in downtown Isla Mujeres.",
      },
      {
        question: "Is there lodging for couples or solo travelers in Isla Mujeres?",
        answer:
          "Yes. Our studios for 2 guests (with or without a balcony) are ideal for couples or solo travelers looking for a compact, central space.",
      },
      {
        question: "Do you have accommodation for families or small groups?",
        answer:
          "Yes. Family apartments and private rooms inside La Casa Naranja sleep up to 5 guests, with a kitchen, A/C, and shared common areas.",
      },
      {
        question: "Is there a house for 6, 8, 10, or 12 people in Isla Mujeres — or for 14?",
        answer:
          "Yes — La Casa Naranja is rented as a whole house (3 bedrooms, 3 bathrooms) and sleeps between 1 and 14 guests. Since it's priced per house rather than per person, it works equally well as a house for 6, for 10, for 12, or for 14 people. It's one block from the Hidalgo pedestrian street and Playa Media Luna.",
      },
      {
        question: "Do you have an apartment for large groups in Isla Mujeres (6, 10, 12, or 14 people)?",
        answer:
          "Yes — La Casa Naranja is essentially a full 3-bedroom apartment rented exclusively to one group, sleeping 1 to 14 guests. It works as an apartment for 6, for 10, for 12, or for 14 people, one block from the Hidalgo pedestrian street.",
      },
      {
        question: "How do I book, and are you also on Airbnb or Booking.com?",
        answer: `You can book directly at puntanorterentals.com with no extra fees and real-time availability. Our properties are also listed on ${CHANNELS}, but booking direct avoids third-party service fees.`,
      },
      {
        question: "What currencies and payment methods do you accept?",
        answer:
          "We accept secure card payments through Stripe in USD, MXN, or EUR — you choose the currency before paying.",
      },
      {
        question: "What is the cancellation policy?",
        answer:
          "Each property lists its own cancellation policy on its detail page. You can manage or modify a confirmed booking from the reservation link sent to your email.",
      },
    ];
  }

  return [
    {
      question: "¿Dónde están ubicadas las propiedades de Punta Norte Rentals?",
      answer:
        "Todas nuestras propiedades están en la Colonia Centro / zona de Punta Norte de Isla Mujeres, Quintana Roo, México, a pocas cuadras entre sí.",
    },
    {
      question: "¿Qué hay a distancia caminable desde las propiedades?",
      answer:
        "A pocas cuadras a pie: Playa Norte, Playa Centro, Playa Media Luna, el Malecón, la peatonal Hidalgo, el muelle del Ferry Ultramar, la Avenida Rueda Medina, la Iglesia Principal de Isla Mujeres, el Super Akí y el Palacio Municipal.",
    },
    {
      question: "¿Qué más se puede visitar en Isla Mujeres cerca de las propiedades?",
      answer:
        "A poca distancia en taxi, golf cart o bicicleta: Playa Lancheros, Playa Paraíso, el Parque Garrafón, Punta Sur y las ruinas del Templo de Ixchel, el faro de Punta Sur, la Tortugranja, Dolphin Discovery, la Hacienda Mundaca, el cementerio histórico de la isla, el Mercado Municipal, la Laguna Makax y la Zona Hotelera. También salen excursiones en barco al Arrecife Manchones, al Museo Subacuático de Arte (MUSA) y a Isla Contoy.",
    },
    {
      question: "¿Qué tipos de alojamiento ofrecen y para cuántos huéspedes?",
      answer:
        "Estudios para 2–3 huéspedes, habitaciones privadas con baño propio dentro de La Casa Naranja para 4–5 huéspedes, apartamentos familiares para hasta 5 huéspedes, y La Casa Naranja completa (3 recámaras) para grupos de 1 a 14 personas. Todas las unidades incluyen aire acondicionado, WiFi y TV.",
    },
    {
      question: "¿Cuántas camas tiene cada propiedad?",
      answer:
        "Varía según la unidad: los estudios tienen 1 o 2 camas (matrimonial + individual, o una sola cama queen), las habitaciones privadas y apartamentos familiares tienen 2 o 3 camas (queen, matrimonial e individual, o king más litera), y La Casa Naranja completa tiene 3 recámaras con 7 camas en total (2 queen, 2 matrimoniales, 2 individuales y 1 litera).",
    },
    {
      question: "¿Todas las propiedades tienen cocina, A/C, WiFi y TV?",
      answer:
        "Aire acondicionado, WiFi y TV están incluidos en todas las unidades. La mayoría también incluye cocina —propia o compartida— con estufa, refrigerador, microondas, cafetera y utensilios. La excepción es nuestro estudio más compacto (14 m²), que no tiene cocina completa (sí incluye microondas, cafetera y vajilla básica).",
    },
    {
      question: "¿Qué propiedades tienen balcón?",
      answer:
        "Dos de nuestros estudios en planta alta tienen balcón privado: el Céntrico Estudio con Balcón y el Encantador Estudio con Balcón, ambos en el centro de Isla Mujeres.",
    },
    {
      question: "¿Hay alojamiento para parejas o viajeros solos en Isla Mujeres?",
      answer:
        "Sí. Nuestros estudios para 2 huéspedes (con o sin balcón) son ideales para parejas o viajeros individuales que buscan un espacio compacto y céntrico.",
    },
    {
      question: "¿Tienen alojamiento para familias o grupos pequeños?",
      answer:
        "Sí. Los apartamentos familiares y las habitaciones privadas dentro de La Casa Naranja alojan hasta 5 huéspedes, con cocina, A/C y áreas comunes compartidas.",
    },
    {
      question: "¿Hay una casa para 6, 8, 10 o 12 personas en Isla Mujeres? ¿Y para 14?",
      answer:
        "Sí — La Casa Naranja se renta completa (3 recámaras, 3 baños) y aloja entre 1 y 14 huéspedes. Como el precio es por la casa completa y no por persona, funciona igual como casa para 6, para 10, para 12 o para 14 personas. Está a una cuadra de la peatonal Hidalgo y de Playa Media Luna.",
    },
    {
      question: "¿Tienen un apartamento o departamento para grupos grandes en Isla Mujeres (6, 10, 12 o 14 personas)?",
      answer:
        "Sí — La Casa Naranja es, en la práctica, un apartamento/departamento completo de 3 recámaras que se renta en exclusiva para un solo grupo, con capacidad de 1 a 14 huéspedes. Funciona como apartamento para 6, para 10, para 12 o para 14 personas, a una cuadra de la peatonal Hidalgo.",
    },
    {
      question: "¿Cómo reservo, y también están en Airbnb o Booking.com?",
      answer: `Puede reservar directamente en puntanorterentals.com sin comisiones adicionales y con disponibilidad en tiempo real. Nuestras propiedades también están publicadas en ${CHANNELS}, pero reservar directo evita las comisiones de esas plataformas.`,
    },
    {
      question: "¿Qué monedas y métodos de pago aceptan?",
      answer:
        "Aceptamos pagos seguros con tarjeta a través de Stripe en USD, MXN o EUR — usted elige la moneda antes de pagar.",
    },
    {
      question: "¿Cuál es la política de cancelación?",
      answer:
        "Cada propiedad indica su propia política de cancelación en su página de detalle. Puede gestionar o modificar una reserva confirmada desde el enlace que recibe por correo electrónico.",
    },
  ];
}

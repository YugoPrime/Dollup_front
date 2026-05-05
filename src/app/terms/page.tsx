import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Terms & Conditions",
  description:
    "The legal terms governing sales between Doll Up Boutique Limited and customers using shop.dollupboutique.com.",
};

export default function TermsPage() {
  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="bg-blush-100 px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px]">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500">
            Legal
          </p>
          <h1 className="font-display text-[32px] leading-[1.05] text-ink md:text-[48px]">
            Sales Terms &amp; Conditions
          </h1>
          <p className="mt-3 font-sans text-[12px] text-ink-muted">
            Last updated: May 2026
          </p>
        </div>
      </section>

      <article className="prose-legal px-6 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-[820px] space-y-10 font-sans text-[14px] leading-[1.7] text-ink-soft">

          {/* 1. Preamble */}
          <Section number="1" title="Preamble">
            <p>
              We are pleased to welcome you to our website <strong>shop.dollupboutique.com</strong> (hereafter referred as the &ldquo;Site&rdquo;).
            </p>
            <p>
              These conditions are concluded between, on one hand, <strong>Doll Up Boutique Limited</strong> under the BRN <strong>C18159019</strong>, VAT registration <strong>27646277</strong>, and located in Quatre Bornes, Mauritius (hereafter referred as &ldquo;Doll Up Boutique&rdquo;) and, on the other hand, customers wishing to make a purchase via the website (hereafter referred as &ldquo;User&rdquo;).
            </p>
            <p>
              The parcels are shipped to Mauritius and Rodrigues. Outside of these areas, the User must contact Doll Up Boutique who will issue a quotation.
            </p>
            <p>These conditions apply exclusively to non-commercial individuals.</p>
            <p>
              We strive to ensure the accuracy and updating of the information on this Site, and we reserve the right to correct the content at any time and without notice. New terms and conditions of sale will, where applicable, be made available on this Site and will apply only to sales made after the change.
            </p>
            <p>
              These terms and conditions of sale exclusively govern the sales of products offered on the Site. They are accessible at the time of order registration. As a result, placing an order implies the User&apos;s adherence to these general terms and conditions of sale.
            </p>
            <h3 className="font-display text-[18px] text-ink">Customer service</h3>
            <p>For any information, question or advice, our customer service is at your disposal:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Tel / WhatsApp: <a href="tel:+23059416359" className="text-coral-500 hover:underline">+230 5941 6359</a></li>
              <li>Email: <a href="mailto:hello@dollupboutique.com" className="text-coral-500 hover:underline">hello@dollupboutique.com</a></li>
              <li>Hours: 9:00 – 17:00 (business days)</li>
            </ul>
          </Section>

          {/* 2. Subject */}
          <Section number="2" title="Subject">
            <p>
              These general terms and conditions of sale are intended to define the terms of sale between Doll Up Boutique and the User, from order to delivery, including payment.
            </p>
            <p>They regulate all the steps necessary to place the order and to ensure the follow-up of this order between the contracting parties.</p>
          </Section>

          {/* 3. Price */}
          <Section number="3" title="Price">
            <p>
              <strong>3.1.</strong> The prices of our products are shown in Mauritian Rupees, all taxes included (VAT), unless otherwise stated and excluding processing and shipping costs.
            </p>
            <p>
              <strong>3.2.</strong> Doll Up Boutique reserves the right to change its prices at any time. Products will be charged on the basis of the rate in effect at the time of order validation, subject to availability.
            </p>
            <p>
              <strong>3.3.</strong> Products remain the property of Doll Up Boutique until full payment of the price. As soon as you physically take possession of the products ordered, the risk of loss or damage of the products is transferred to you.
            </p>
          </Section>

          {/* 4. Orders */}
          <Section number="4" title="Orders">
            <p><strong>4.1.</strong> Contract information is presented in English or French and will be confirmed no later than at the time the order is validated.</p>
            <p><strong>4.2.</strong> The User places the order online from the Site. The order is registered only if the User has clearly identified themselves by entering an email and password which are strictly personal.</p>
            <p><strong>4.3.</strong> Once the basket has been validated, the User must accept the General Terms and Conditions of Sale, choose the address and delivery method, and validate the payment, the latter step formalising the sales contract between Doll Up Boutique and the User.</p>
            <p><strong>4.4.</strong> Any order constitutes acceptance of prices and product descriptions available for sale.</p>
            <p><strong>4.5.</strong> Doll Up Boutique will acknowledge receipt of the order as soon as it is validated, by email.</p>
            <p><strong>4.6.</strong> In some cases, such as non-payment, an incorrect address or any issue with the User&apos;s account, Doll Up Boutique reserves the right to block the order until the issue is resolved. For any questions relating to the follow-up of an order, the User can use the order tracker on the Site or call <strong>+230 5941 6359</strong> from Monday to Friday, 9:00 – 17:00.</p>
            <p><strong>4.7.</strong> Doll Up Boutique reserves the right not to register a payment, and not to confirm an order for any reason, in particular in the event of a supply problem or in case of difficulty with the order received.</p>
            <p><strong>4.8.</strong> Doll Up Boutique undertakes to honour orders received on the Site within the limits of available product stocks. In the event of an out-of-stock product after your order is placed, Doll Up Boutique undertakes to notify the User by email or phone and to indicate the waiting time for receipt of this product.</p>
            <p><strong>4.9.</strong> If you choose a pickup point for delivery and opt for cash payment, please ensure you keep your phone with you as we will call you twice only. If left unanswered, the order will automatically be cancelled.</p>
          </Section>

          {/* 5. Validating */}
          <Section number="5" title="Validating your order">
            <p><strong>5.1.</strong> All orders are placed on the Site.</p>
            <p><strong>5.2.</strong> All data provided and the recorded confirmation will serve as proof of the transaction.</p>
            <p><strong>5.3.</strong> You declare that you have full knowledge of these conditions.</p>
            <p><strong>5.4.</strong> Order confirmation is equivalent to signing and accepting the transaction.</p>
            <p><strong>5.5.</strong> A summary of your order information and these Terms and Conditions will be communicated to you via the email address confirmed at order time.</p>
            <p><strong>5.6.</strong> You have 24 hours to contact us at <strong>+230 5941 6359</strong> if you need to modify your order after checkout. Please use your order ID so that we can identify you.</p>
          </Section>

          {/* 6. Payment */}
          <Section number="6" title="Payment">
            <p><strong>6.1.</strong> Validating your order means that you agree to pay the indicated price.</p>
            <p><strong>6.2.</strong> The User must pay a fixed rate corresponding to the cost of processing the order, unless they have a special offer exempting them. To find out the amount of these fees, refer to the <a href="/shipping" className="text-coral-500 hover:underline">Shipping page</a>.</p>
            <p><strong>6.3.</strong> The User&apos;s account will be debited the total amount of the order at validation, followed by a confirmation email. In the case of stock shortage or unavailability, the User&apos;s account will be re-credited if payment was already made.</p>
            <p><strong>6.4.</strong> Payment is possible by Juice, bank transfer, myT Money or cash on delivery. Card payments are coming soon.</p>
            <p><strong>6.5.</strong> When payment is made by Juice or bank transfer, proof of payment must be sent to <a href="mailto:hello@dollupboutique.com" className="text-coral-500 hover:underline">hello@dollupboutique.com</a>.</p>
          </Section>

          {/* 7. Cancellation & Returns */}
          <Section number="7" title="Cancellation & Returns">
            <p><strong>7.1.</strong> Returns are to be made in their original and complete state (packaging). Any damage to the product on this occasion may affect the right of cancellation.</p>
            <p><strong>7.2.</strong> Return costs are the responsibility of the User.</p>
            <p><strong>7.3.</strong> If the right to cancel is exercised, Doll Up Boutique will refund the amounts paid within 30 days of notification of the request, using the same payment method used during the order (bank transfer where applicable).</p>
            <p>For full conditions please consult our <a href="/returns" className="text-coral-500 hover:underline">Refund &amp; Returns Policy</a>.</p>
          </Section>

          {/* 8. Availability */}
          <Section number="8" title="Availability">
            <p><strong>8.1.</strong> Our products are available as long as they are visible on the Site and within the limits of available stocks. For non-stocked products, our offers are valid subject to the availability of our suppliers.</p>
            <p><strong>8.2.</strong> If your product is unavailable after your order is placed, we will let you know by email or phone. Your order will be automatically cancelled and no debit will be made.</p>
          </Section>

          {/* 9. Delivery */}
          <Section number="9" title="Delivery">
            <p><strong>9.1.</strong> Products are delivered to the address indicated during the ordering process, within the timeframe shown on the order validation page. It is the User&apos;s responsibility to verify the delivery address, phone number and email entered on the Site.</p>
            <p><strong>9.2.</strong> Once the order confirmation email is sent and payment is made, the delivery date will be communicated.</p>
            <p>
              <strong>9.3.</strong> Delivery options:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Home or office delivery (address communicated at registration)</li>
              <li>Pickup at our Pereybere point (near Winners)</li>
              <li>Shipping by Mauritius Post</li>
            </ul>
            <p><strong>9.4.</strong> In case of delay of shipment, an email will be sent to inform you of any consequence on the delivery time.</p>
            <p><strong>9.5.</strong> In the event of delivery by a carrier, Doll Up Boutique cannot be held responsible for delayed delivery due exclusively to customer unavailability after several appointment proposals.</p>
          </Section>

          {/* 10. Shipping costs */}
          <Section number="10" title="Shipping costs">
            <p>The User can have the package home-delivered, posted, or picked up.</p>
            <p>Doll Up Boutique undertakes to deliver ordered items as soon as possible. The average time for in-stock items is 24–72 hours for delivery in Mauritius and approximately 2 weeks for Rodrigues.</p>
            <p>For full shipping fees, please refer to our <a href="/shipping" className="text-coral-500 hover:underline">Shipping page</a>.</p>
          </Section>

          {/* 11. Liability */}
          <Section number="11" title="Liability">
            <p>Doll Up Boutique is committed to accurately describing the products sold on shop.dollupboutique.com.</p>
            <p>Doll Up Boutique&apos;s liability cannot be incurred in the event that its non-performance of obligations is attributable either to the unpredictable and insurmountable fact of a third party to the contract or to a case of force majeure.</p>
            <p>Doll Up Boutique cannot be held responsible for the breach of contract concluded in the event of a product out of stock or unavailability, of force majeure, or of issues with means of transport and/or communications. Doll Up Boutique will not incur any liability for indirect damages such as loss of operations, loss of profit, loss of chance, or other costs.</p>
            <p>Similarly, Doll Up Boutique cannot be held liable for any inconvenience or damage inherent in the use of the Internet, including service disruption, external intrusion or the presence of computer viruses.</p>
          </Section>

          {/* 12. Personal data */}
          <Section number="12" title="Personal data">
            <p><strong>12.1.</strong> Doll Up Boutique collects user data, including through the use of cookies. Details are described in our <a href="/privacy" className="text-coral-500 hover:underline">Privacy Policy</a>.</p>
            <p><strong>12.2.</strong> Doll Up Boutique is committed to protecting the data and information provided by the User in accordance with the Data Protection Act 2017 of Mauritius.</p>
            <p><strong>12.3.</strong> Doll Up Boutique receives and retains the information that the User enters on the Site, and uses it to respond to queries, customise future online purchases, improve services and communicate with the User.</p>
            <p><strong>12.4.</strong> The User can at any time contact us at <a href="mailto:hello@dollupboutique.com" className="text-coral-500 hover:underline">hello@dollupboutique.com</a> to request data removal from our database.</p>
          </Section>

          {/* 13. IP */}
          <Section number="13" title="Intellectual property">
            <p>In accordance with the laws governing literary and artistic property and other similar rights, this Site and all elements (photographs, marks, designs, logos, graphics, etc.) and their compilation are the exclusive property of Doll Up Boutique or its suppliers, who do not grant any license or rights other than to view the Site.</p>
            <p>The reproduction or use of all or part of these items is permitted only for personal and private information purposes; any reproduction or copy made for other purposes is expressly prohibited and will be sanctioned under the laws of Intellectual Property, unless pre-approved in writing by Doll Up Boutique.</p>
            <p>The creation of any hyperlink to the home page of this Site or any other page is subject to the express, prior and written agreement of Doll Up Boutique.</p>
          </Section>

          {/* 14. Jurisdiction */}
          <Section number="14" title="Jurisdiction">
            <p>These terms and conditions are governed by the laws of the Republic of Mauritius. Any dispute will be submitted to the exclusive jurisdiction of the competent courts of Mauritius.</p>
          </Section>

        </div>
      </article>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24" id={`s-${number}`}>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-[20px] text-coral-500">{number}.</span>
        <h2 className="font-display text-[24px] leading-tight text-ink md:text-[28px]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

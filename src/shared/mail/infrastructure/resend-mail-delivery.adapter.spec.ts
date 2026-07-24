import { ResendMailDeliveryAdapter } from "./resend-mail-delivery.adapter";

describe("ResendMailDeliveryAdapter", () => {
	let adapter: ResendMailDeliveryAdapter;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal("fetch", fetchMock);
		adapter = new ResendMailDeliveryAdapter({
			from: "Cuentas Claras <noreply@example.com>",
			provider: "resend",
			appPublicUrl: "https://app.example.com",
			verificationTokenTtl: "24h",
			invitationTokenTtl: "7d",
			resendApiKey: "test-api-key",
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends a Spanish verification email using the professional responsive layout", async () => {
		await adapter.sendVerificationEmail({
			to: "ana@example.com",
			name: "Ana <script>",
			verificationUrl: "https://app.example.com/verify?token=abc",
		});

		const request = fetchMock.mock.calls[0];
		const options = request[1] as RequestInit;
		const payload = JSON.parse(options.body as string);

		expect(payload).toMatchObject({
			from: "Cuentas Claras <noreply@example.com>",
			to: "ana@example.com",
			subject: "Verifica tu correo electrónico de Cuentas Claras",
		});
		expect(payload.html).toContain("Hola Ana &lt;script&gt;");
		expect(payload.html).toContain("Verifica tu correo electrónico");
		expect(payload.html).toContain("Verificar correo");
		expect(payload.html).not.toContain("Verificar mi correo electrónico");
		expect(payload.html).toContain(
			'href="https://app.example.com/verify?token=abc"',
		);
		expect(payload.html).toContain('role="presentation"');
		expect(payload.html).toContain("max-width: 600px");
		expect(payload.html).toContain("Cuentas Claras");
	});

	it("sends a Spanish group invitation email with escaped names and the original link", async () => {
		await adapter.sendGroupInvitationEmail({
			to: "ana@example.com",
			inviteeName: "Ana & Luis",
			groupName: 'Viaje de "verano"',
			invitationUrl: "cuentasclaras://group-invitations/accept?token=abc",
		});

		const options = fetchMock.mock.calls[0][1] as RequestInit;
		const payload = JSON.parse(options.body as string);

		expect(payload.subject).toBe('Te han invitado a Viaje de "verano"');
		expect(payload.html).toContain("Hola Ana &amp; Luis");
		expect(payload.html).toContain("Viaje de &quot;verano&quot;");
		expect(payload.html).toContain(
			"Has recibido una invitación para unirte al grupo",
		);
		expect(payload.html).toContain("Aceptar la invitación");
		expect(payload.html).toContain(
			'href="cuentasclaras://group-invitations/accept?token=abc"',
		);
	});

	it("throws when Resend rejects the delivery", async () => {
		fetchMock.mockResolvedValue({ ok: false });

		await expect(
			adapter.sendVerificationEmail({
				to: "ana@example.com",
				name: "Ana",
				verificationUrl: "https://example.com/verify",
			}),
		).rejects.toThrow("MAIL_DELIVERY_FAILED");
	});
});

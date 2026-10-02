import { contacts } from '../data/profile'

export default function Contacts() {
	return (
		<footer id="contact">
			<div className="content">
				<h2>#Контакты</h2>
				<div className="contact-container">
					{contacts.map((contact) => (
						<div className="contact-row" key={contact.href}>
							<i className={`contact-row-icon ${contact.icon}-icon`} />
							<a href={contact.href}>{contact.label}</a>
						</div>
					))}
				</div>
			</div>
		</footer>
	)
}

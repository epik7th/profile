import photo from '../assets/images/photo.jpeg'

export default function Hero() {
	return (
		<section id="main">
			<article className="content">
				<div className="main-title-photo">
					<div className="main-text">
						<div className="description typewriter">Привет! Я Руслан Хакимов -</div>
						<div className="title">
							{'<Fullstack'} <br /> {'web Developer / >'}
						</div>
					</div>
					<div className="photo">
						<img src={photo} alt="Фото профиля" />
					</div>
				</div>
			</article>
		</section>
	)
}

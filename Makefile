clean:
	rm prisma/data.db

migrate:
	npx prisma migrate dev

refresh:
	make clean
	make migrate
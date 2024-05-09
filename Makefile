clean:
	rm -f prisma/data.db

migrate:
	npx prisma migrate dev

refresh:
	make clean
	rm -rf prisma/migrations
	npx prisma migrate dev --name init
	npx prisma generate